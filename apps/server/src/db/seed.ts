import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  db,
  organization,
  organizationSubscription,
  organizationUser,
  user,
} from "./index";

export interface CreateUserWithOrgParams {
  userId: string;
  userName: string;
  userEmail: string;
  orgName?: string;
  orgSlug?: string;
}

/**
 * Creates a new user with their default organization and subscription
 * This should be called during the signup process
 */
export async function createUserWithOrganization({
  userId,
  userName,
  userEmail,
  orgName,
  orgSlug,
}: CreateUserWithOrgParams) {
  // Default org name/slug if not provided
  const defaultOrgName = orgName || `${userName}'s Organization`;
  const defaultOrgSlug = orgSlug || generateSlug(userName);

  try {
    await db.transaction(async (tx) => {
      // Create the organization first
      const [newOrg] = await tx
        .insert(organization)
        .values({
          id: `org_${generateId()}`,
          name: defaultOrgName,
          slug: defaultOrgSlug,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            settings: {
              autoCreated: true,
              onboardingCompleted: false,
            },
            features: ["basic"],
            limits: {
              members: 5,
              apiKeys: 3,
            },
          },
        })
        .returning();

      // Create the subscription for the organization
      await tx.insert(organizationSubscription).values({
        id: `sub_${generateId()}`,
        organizationId: newOrg.id,
        planTier: "free",
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        },
      });

      // Add the user as the owner of the organization
      await tx.insert(organizationUser).values({
        id: `orguser_${generateId()}`,
        organizationId: newOrg.id,
        userId: userId,
        role: "owner",
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          preferences: {
            notifications: true,
            emailUpdates: true,
          },
        },
      });
    });

    console.log(
      `✅ Created organization "${defaultOrgName}" for user ${userEmail}`
    );
    return { orgName: defaultOrgName, orgSlug: defaultOrgSlug };
  } catch (error) {
    console.error("❌ Failed to create user organization:", error);
    throw error;
  }
}

/**
 * Get user's organizations with their role and subscription info
 */
export async function getUserOrganizations(userId: string) {
  return await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      planTier: organizationSubscription.planTier,
      subscriptionStatus: organizationSubscription.subscriptionStatus,
      role: organizationUser.role,
      joinedAt: organizationUser.joinedAt,
    })
    .from(organization)
    .innerJoin(
      organizationUser,
      eq(organization.id, organizationUser.organizationId)
    )
    .leftJoin(
      organizationSubscription,
      eq(organization.id, organizationSubscription.organizationId)
    )
    .where(eq(organizationUser.userId, userId));
}

/**
 * Check if user has access to organization with minimum role
 */
export async function hasOrganizationAccess(
  userId: string,
  orgId: string,
  minRole: "viewer" | "member" | "admin" | "owner" = "member"
) {
  const roleHierarchy = {
    viewer: 0,
    member: 1,
    admin: 2,
    owner: 3,
  };

  const [membership] = await db
    .select({ role: organizationUser.role })
    .from(organizationUser)
    .where(
      eq(organizationUser.userId, userId) &&
        eq(organizationUser.organizationId, orgId)
    );

  if (!membership) return false;

  return roleHierarchy[membership.role] >= roleHierarchy[minRole];
}

// Utility functions
function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// Main execution block - runs when script is executed directly
async function main() {
  try {
    console.log("🌱 Starting database seed...");

    // Test database connection
    console.log("Testing database connection...");
    await db.select().from(user).limit(1);
    console.log("✅ Database connection successful");

    // Create a test user first (this would normally be done by better-auth during signup)
    const testUserId = `user_${generateId()}`;
    const testUserName = "Test User";
    const testUserEmail = "test@example.com";

    console.log("Creating test user in database...");
    await db.insert(user).values({
      id: testUserId,
      name: testUserName,
      email: testUserEmail,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        seedUser: true,
        createdBy: "seed-script",
      },
    });
    console.log("✅ Test user created");

    console.log("Creating test organization for user...");
    const result = await createUserWithOrganization({
      userId: testUserId,
      userName: testUserName,
      userEmail: testUserEmail,
      orgName: "Test Organization",
      orgSlug: "test-org",
    });

    console.log("✅ Seed completed successfully!", result);

    // Test the helper functions
    console.log("Testing helper functions...");
    const userOrgs = await getUserOrganizations(testUserId);
    console.log("User organizations:", userOrgs);

    const hasAccess = await hasOrganizationAccess(
      testUserId,
      userOrgs[0]?.id || "",
      "owner"
    );
    console.log("User has owner access:", hasAccess);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.main) {
  main();
}
