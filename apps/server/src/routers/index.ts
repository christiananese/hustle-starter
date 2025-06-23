import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { apiKey, db, organization, user } from "../db";
import { createUserWithOrganization, getUserOrganizations } from "../db/seed";
import { generateApiKey, maskApiKey } from "../lib/api-keys";
import {
  orgProcedure,
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
      .orderBy(apiKey.createdAt);

    return keys.map((key) => ({
      ...key,
      maskedKey: `${key.keyPrefix}_${"*".repeat(28)}`,
    }));
  }),

  createApiKey: orgProcedure
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

  revokeApiKey: orgProcedure
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
});

export type AppRouter = typeof appRouter;
