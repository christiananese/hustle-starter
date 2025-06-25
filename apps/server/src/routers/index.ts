import crypto from "crypto";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  apiKey,
  db,
  organization,
  organizationInvite,
  organizationUser,
  user,
} from "../db";
import { createUserWithOrganization, getUserOrganizations } from "../db/seed";
import { generateApiKey, maskApiKey } from "../lib/api-keys";
import {
  adminProcedure,
  orgProcedure,
  ownerProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../lib/trpc";

export const appRouter = router({
  // Health check
  healthCheck: publicProcedure.query(() => {
    console.log("HEALTH CHECK");
    return "OK";
  }),

  // User Profile Management
  me: protectedProcedure.query(async ({ ctx }) => {
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, ctx.session.user.id));

    if (!currentUser) {
      throw new Error("User not found");
    }

    return currentUser;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await db
        .update(user)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id))
        .returning();

      return updatedUser;
    }),

  // Organization Management
  myOrganizations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserOrganizations(ctx.session.user.id);
  }),

  createOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken
      const [existingOrg] = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, input.slug));

      if (existingOrg) {
        throw new Error("Organization slug already taken");
      }

      // Create organization with subscription
      await createUserWithOrganization({
        userId: ctx.session.user.id,
        userName: ctx.session.user.name || "User",
        userEmail: ctx.session.user.email,
        orgName: input.name,
        orgSlug: input.slug,
      });

      // Return the created organization details
      const [newOrg] = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          createdAt: organization.createdAt,
        })
        .from(organization)
        .where(eq(organization.slug, input.slug));

      return newOrg;
    }),

  // Update organization settings - requires admin role
  updateOrganization: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        logo: z.string().url().optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedOrg] = await db
        .update(organization)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(organization.id, ctx.organizationId))
        .returning({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          logo: organization.logo,
          website: organization.website,
          updatedAt: organization.updatedAt,
        });

      return updatedOrg;
    }),

  // Delete organization - requires owner role
  deleteOrganization: ownerProcedure.mutation(async ({ ctx }) => {
    // Delete the organization (cascade will handle related records)
    await db
      .delete(organization)
      .where(eq(organization.id, ctx.organizationId));

    return { success: true };
  }),

  // Organization User Management
  listOrganizationUsers: orgProcedure.query(async ({ ctx }) => {
    const users = await db
      .select({
        id: organizationUser.id,
        userId: organizationUser.userId,
        role: organizationUser.role,
        joinedAt: organizationUser.joinedAt,
        invitedAt: organizationUser.invitedAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(organizationUser)
      .innerJoin(user, eq(organizationUser.userId, user.id))
      .where(eq(organizationUser.organizationId, ctx.organizationId))
      .orderBy(organizationUser.createdAt);

    return users;
  }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "member", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent changing owner role
      const [currentMembership] = await db
        .select({ role: organizationUser.role })
        .from(organizationUser)
        .where(
          and(
            eq(organizationUser.userId, input.userId),
            eq(organizationUser.organizationId, ctx.organizationId)
          )
        );

      if (currentMembership?.role === "owner") {
        throw new Error("Cannot change owner role");
      }

      // Update role
      const [updatedMember] = await db
        .update(organizationUser)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(organizationUser.userId, input.userId),
            eq(organizationUser.organizationId, ctx.organizationId)
          )
        )
        .returning({
          id: organizationUser.id,
          role: organizationUser.role,
        });

      return updatedMember;
    }),

  removeUserFromOrganization: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent removing owner
      const [currentMembership] = await db
        .select({ role: organizationUser.role })
        .from(organizationUser)
        .where(
          and(
            eq(organizationUser.userId, input.userId),
            eq(organizationUser.organizationId, ctx.organizationId)
          )
        );

      if (currentMembership?.role === "owner") {
        throw new Error("Cannot remove organization owner");
      }

      // Remove user
      const result = await db
        .delete(organizationUser)
        .where(
          and(
            eq(organizationUser.userId, input.userId),
            eq(organizationUser.organizationId, ctx.organizationId)
          )
        )
        .returning({ id: organizationUser.id });

      if (!result.length) {
        throw new Error("User not found in organization");
      }

      return { success: true };
    }),

  // Organization-scoped operations (example)
  orgData: orgProcedure.query(({ ctx }) => {
    return {
      message: "This is organization data",
      organizationId: ctx.organizationId,
      userRole: ctx.organizationAccess.role,
    };
  }),

  // API Key Management
  listApiKeys: orgProcedure.query(async ({ ctx }) => {
    const keys = await db
      .select({
        id: apiKey.id,
        name: apiKey.name,
        description: apiKey.description,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
        revokedAt: apiKey.revokedAt,
      })
      .from(apiKey)
      .where(
        and(
          eq(apiKey.organizationId, ctx.organizationId),
          eq(apiKey.isActive, "true")
        )
      )
      .orderBy(desc(apiKey.createdAt));

    return keys.map((key) => ({
      ...key,
      maskedKey: `${key.keyPrefix}_${"*".repeat(28)}`,
    }));
  }),

  createApiKey: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate secure API key
      const { key, keyHash, keyPrefix } = generateApiKey();

      // Create API key record
      const [newApiKey] = await db
        .insert(apiKey)
        .values({
          id: nanoid(),
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description,
          keyHash,
          keyPrefix,
          scopes: input.scopes || [],
          isActive: "true",
          expiresAt: input.expiresAt,
          createdBy: ctx.session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({
          id: apiKey.id,
          name: apiKey.name,
          description: apiKey.description,
          keyPrefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          createdAt: apiKey.createdAt,
        });

      // Return the new key (only time the full key is returned!)
      return {
        ...newApiKey,
        key, // Full key - only returned once!
        maskedKey: maskApiKey(key),
      };
    }),

  revokeApiKey: adminProcedure
    .input(
      z.object({
        keyId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update the API key to mark it as revoked
      const [revokedKey] = await db
        .update(apiKey)
        .set({
          isActive: "false",
          revokedBy: ctx.session.user.id,
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(apiKey.id, input.keyId),
            eq(apiKey.organizationId, ctx.organizationId),
            eq(apiKey.isActive, "true")
          )
        )
        .returning({
          id: apiKey.id,
          name: apiKey.name,
        });

      if (!revokedKey) {
        throw new Error("API key not found or already revoked");
      }

      return revokedKey;
    }),

  updateApiKeyUsage: orgProcedure
    .input(
      z.object({
        keyId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update last used timestamp
      await db
        .update(apiKey)
        .set({
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(apiKey.id, input.keyId),
            eq(apiKey.organizationId, ctx.organizationId),
            eq(apiKey.isActive, "true")
          )
        );

      return { success: true };
    }),

  // Billing Management
  getCurrentSubscription: orgProcedure.query(async ({ ctx }) => {
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        planTier: organization.planTier,
        stripeCustomerId: organization.stripeCustomerId,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        subscriptionStatus: organization.subscriptionStatus,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org) {
      throw new Error("Organization not found");
    }

    return org;
  }),

  createCheckoutSession: adminProcedure
    .input(
      z.object({
        planId: z.enum(["basic", "pro"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { StripeService } = await import("../lib/stripe");
      const { PLANS } = await import("../lib/plans");

      const plan = PLANS[input.planId];
      if (!plan.priceId) {
        throw new Error(
          `${plan.name} plan is not available for checkout. Please contact support.`
        );
      }

      // Get organization details
      const [org] = await db
        .select({
          id: organization.id,
          name: organization.name,
          stripeCustomerId: organization.stripeCustomerId,
        })
        .from(organization)
        .where(eq(organization.id, ctx.organizationId));

      if (!org) {
        throw new Error("Organization not found");
      }

      // Create checkout session
      const session = await StripeService.createCheckoutSession({
        customerId: org.stripeCustomerId || undefined,
        priceId: plan.priceId,
        orgId: org.id,
        successUrl: `${process.env.CORS_ORIGIN}/${org.id}/settings/billing?success=true`,
        cancelUrl: `${process.env.CORS_ORIGIN}/${org.id}/settings/billing?canceled=true`,
      });

      return { url: session.url };
    }),

  createPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    const { StripeService } = await import("../lib/stripe");

    // Get organization details
    const [org] = await db
      .select({
        id: organization.id,
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    // Create portal session
    const session = await StripeService.createPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${process.env.CORS_ORIGIN}/${org.id}/settings/billing`,
    });

    return { url: session.url };
  }),

  cancelSubscription: ownerProcedure.mutation(async ({ ctx }) => {
    const { StripeService } = await import("../lib/stripe");

    // Get organization details
    const [org] = await db
      .select({
        id: organization.id,
        stripeSubscriptionId: organization.stripeSubscriptionId,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    // Cancel subscription at period end
    await StripeService.cancelSubscription({
      subscriptionId: org.stripeSubscriptionId,
      immediately: false,
    });

    // Update organization status
    await db
      .update(organization)
      .set({
        subscriptionStatus: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(organization.id, ctx.organizationId));

    return { success: true };
  }),

  getPlans: publicProcedure.query(async () => {
    const { PLANS } = await import("../lib/plans");

    // Return plans without sensitive data
    return Object.entries(PLANS).map(([planId, plan]) => ({
      id: planId,
      name: plan.name,
      price: plan.price,
      features: plan.features,
      isCustom: "isCustom" in plan ? plan.isCustom : false,
    }));
  }),

  // Organization Usage Statistics
  getOrganizationUsage: orgProcedure.query(async ({ ctx }) => {
    const { PLANS } = await import("../lib/plans");

    // Get current organization details
    const [org] = await db
      .select({
        id: organization.id,
        planTier: organization.planTier,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get plan limits
    const plan = PLANS[org.planTier as keyof typeof PLANS];

    // Count active API keys
    const [apiKeyCount] = await db
      .select({ count: count() })
      .from(apiKey)
      .where(
        and(
          eq(apiKey.organizationId, ctx.organizationId),
          eq(apiKey.isActive, "true")
        )
      );

    // Count organization members
    const [memberCount] = await db
      .select({ count: count() })
      .from(organizationUser)
      .where(eq(organizationUser.organizationId, ctx.organizationId));

    return {
      planTier: org.planTier,
      limits: plan.limits,
      usage: {
        apiKeys: apiKeyCount.count || 0,
        members: memberCount.count || 0,
        projects: 0, // Placeholder - implement based on your app's project schema
      },
    };
  }),

  // Organization Invites
  createInvite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "member", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { EmailService } = await import("../emails");

      // Check if user is already a member
      const existingMember = await db
        .select()
        .from(organizationUser)
        .innerJoin(user, eq(organizationUser.userId, user.id))
        .where(
          and(
            eq(organizationUser.organizationId, ctx.organizationId),
            eq(user.email, input.email)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        throw new Error("User is already a member of this organization");
      }

      // Check if there's already a pending invite
      const existingInvite = await db
        .select()
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.organizationId, ctx.organizationId),
            eq(organizationInvite.email, input.email),
            isNull(organizationInvite.acceptedAt)
          )
        )
        .limit(1);

      if (existingInvite.length > 0) {
        throw new Error("An invitation has already been sent to this email");
      }

      // Get organization and inviter details
      const [org] = await db
        .select({
          id: organization.id,
          name: organization.name,
        })
        .from(organization)
        .where(eq(organization.id, ctx.organizationId));

      const [inviter] = await db
        .select({
          name: user.name,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id));

      if (!org || !inviter) {
        throw new Error("Organization or inviter not found");
      }

      // Generate invite token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invite record
      const [invite] = await db
        .insert(organizationInvite)
        .values({
          id: `invite_${crypto.randomUUID().replace(/-/g, "")}`,
          organizationId: ctx.organizationId,
          email: input.email,
          role: input.role,
          token,
          expiresAt,
          invitedBy: ctx.session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({
          id: organizationInvite.id,
          email: organizationInvite.email,
          role: organizationInvite.role,
        });

      // Send invite email
      try {
        const inviteUrl = `${process.env.CORS_ORIGIN}/auth/accept-invite?token=${token}`;

        await EmailService.sendInvite({
          inviterName: inviter.name || "Someone",
          inviterEmail: inviter.email,
          organizationName: org.name,
          inviteUrl,
          recipientEmail: input.email,
          role: input.role,
        });
      } catch (error) {
        console.error("Failed to send invite email:", error);
        // Don't fail the whole operation if email fails
        // The invite is still created and can be resent
      }

      return invite;
    }),

  listInvites: orgProcedure.query(async ({ ctx }) => {
    const invites = await db
      .select({
        id: organizationInvite.id,
        email: organizationInvite.email,
        role: organizationInvite.role,
        createdAt: organizationInvite.createdAt,
        expiresAt: organizationInvite.expiresAt,
        acceptedAt: organizationInvite.acceptedAt,
        inviterName: user.name,
        inviterEmail: user.email,
      })
      .from(organizationInvite)
      .leftJoin(user, eq(organizationInvite.invitedBy, user.id))
      .where(eq(organizationInvite.organizationId, ctx.organizationId))
      .orderBy(organizationInvite.createdAt);

    return invites.map((invite) => ({
      ...invite,
      isExpired: invite.expiresAt < new Date(),
      isPending: !invite.acceptedAt && invite.expiresAt >= new Date(),
    }));
  }),

  resendInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { EmailService } = await import("../emails");

      // Get invite details
      const [invite] = await db
        .select({
          id: organizationInvite.id,
          email: organizationInvite.email,
          role: organizationInvite.role,
          token: organizationInvite.token,
          acceptedAt: organizationInvite.acceptedAt,
          expiresAt: organizationInvite.expiresAt,
        })
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.id, input.inviteId),
            eq(organizationInvite.organizationId, ctx.organizationId)
          )
        );

      if (!invite) {
        throw new Error("Invite not found");
      }

      if (invite.acceptedAt) {
        throw new Error("Invite has already been accepted");
      }

      // Extend expiration if needed
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (invite.expiresAt < new Date()) {
        await db
          .update(organizationInvite)
          .set({
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(organizationInvite.id, input.inviteId));
      }

      // Get organization and inviter details
      const [org] = await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, ctx.organizationId));

      const [inviter] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, ctx.session.user.id));

      if (!org || !inviter) {
        throw new Error("Organization or inviter not found");
      }

      // Resend invite email
      const inviteUrl = `${process.env.CORS_ORIGIN}/auth/accept-invite?token=${invite.token}`;

      await EmailService.sendInvite({
        inviterName: inviter.name || "Someone",
        inviterEmail: inviter.email,
        organizationName: org.name,
        inviteUrl,
        recipientEmail: invite.email,
        role: invite.role,
      });

      return { success: true };
    }),

  revokeInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .delete(organizationInvite)
        .where(
          and(
            eq(organizationInvite.id, input.inviteId),
            eq(organizationInvite.organizationId, ctx.organizationId),
            isNull(organizationInvite.acceptedAt)
          )
        )
        .returning({ id: organizationInvite.id });

      if (!result.length) {
        throw new Error("Invite not found or already accepted");
      }

      return { success: true };
    }),

  // Public route for accepting invites
  acceptInvite: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      // Find the invite by token
      const [invite] = await db
        .select({
          id: organizationInvite.id,
          organizationId: organizationInvite.organizationId,
          email: organizationInvite.email,
          role: organizationInvite.role,
          expiresAt: organizationInvite.expiresAt,
          acceptedAt: organizationInvite.acceptedAt,
        })
        .from(organizationInvite)
        .where(eq(organizationInvite.token, input.token));

      if (!invite) {
        throw new Error("Invalid invite token");
      }

      if (invite.acceptedAt) {
        throw new Error("Invite has already been accepted");
      }

      if (invite.expiresAt < new Date()) {
        throw new Error("Invite has expired");
      }

      // Get organization name for display
      const [org] = await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, invite.organizationId));

      // Return invite details for the frontend to handle
      // The actual acceptance happens after user authentication
      return {
        email: invite.email,
        role: invite.role,
        organizationId: invite.organizationId,
        organizationName: org?.name || "Unknown Organization",
        inviteId: invite.id,
      };
    }),

  // Complete invite acceptance after user is authenticated
  completeInviteAcceptance: publicProcedure
    .input(z.object({ token: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      const { EmailService } = await import("../emails");

      return await db.transaction(async (tx) => {
        // Get invite details
        const [invite] = await tx
          .select({
            id: organizationInvite.id,
            organizationId: organizationInvite.organizationId,
            email: organizationInvite.email,
            role: organizationInvite.role,
            expiresAt: organizationInvite.expiresAt,
            acceptedAt: organizationInvite.acceptedAt,
          })
          .from(organizationInvite)
          .where(eq(organizationInvite.token, input.token));

        if (!invite) {
          throw new Error("Invalid invite token");
        }

        if (invite.acceptedAt) {
          throw new Error("Invite has already been accepted");
        }

        if (invite.expiresAt < new Date()) {
          throw new Error("Invite has expired");
        }

        // Get user details
        const [userDetails] = await tx
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
          })
          .from(user)
          .where(eq(user.id, input.userId));

        if (!userDetails) {
          throw new Error("User not found");
        }

        // Verify email matches
        if (userDetails.email !== invite.email) {
          throw new Error(
            "Email mismatch - please sign in with the invited email"
          );
        }

        // Check if user is already a member
        const existingMember = await tx
          .select()
          .from(organizationUser)
          .where(
            and(
              eq(organizationUser.organizationId, invite.organizationId),
              eq(organizationUser.userId, input.userId)
            )
          )
          .limit(1);

        if (existingMember.length > 0) {
          throw new Error("User is already a member of this organization");
        }

        // Add user to organization
        await tx.insert(organizationUser).values({
          id: `orguser_${crypto.randomUUID().replace(/-/g, "")}`,
          organizationId: invite.organizationId,
          userId: input.userId,
          role: invite.role,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mark invite as accepted
        await tx
          .update(organizationInvite)
          .set({
            acceptedBy: input.userId,
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(organizationInvite.id, invite.id));

        // Get organization details for welcome email
        const [org] = await tx
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, invite.organizationId));

        // Send welcome email
        if (org) {
          try {
            const dashboardUrl = `${process.env.CORS_ORIGIN}/${invite.organizationId}`;

            await EmailService.sendWelcome({
              userName: userDetails.name || "User",
              userEmail: userDetails.email,
              organizationName: org.name,
              role: invite.role,
              dashboardUrl,
            });
          } catch (error) {
            console.error("Failed to send welcome email:", error);
            // Don't fail the whole operation if email fails
          }
        }

        return {
          success: true,
          organizationId: invite.organizationId,
          role: invite.role,
        };
      });
    }),
});

export type AppRouter = typeof appRouter;
