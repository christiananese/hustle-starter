import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { apiKey, db, organization, organizationUser, user } from "../db";
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
      const result = await createUserWithOrganization({
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

      const [updatedUser] = await db
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

      return updatedUser;
    }),

  removeUserFromOrganization: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent removing owner
      const [membership] = await db
        .select({ role: organizationUser.role })
        .from(organizationUser)
        .where(
          and(
            eq(organizationUser.userId, input.userId),
            eq(organizationUser.organizationId, ctx.organizationId)
          )
        );

      if (membership?.role === "owner") {
        throw new Error("Cannot remove organization owner");
      }

      await db
        .delete(organizationUser)
        .where(
          and(
            eq(organizationUser.userId, input.userId),
            eq(organizationUser.organizationId, ctx.organizationId)
          )
        );

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
        throw new Error("Invalid plan selected");
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
});

export type AppRouter = typeof appRouter;
