import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { apiKey, db } from "../db";
import { generateApiKey, maskApiKey } from "../lib/api-keys";
import { adminProcedure, orgProcedure, router } from "../lib/trpc";

export const apiKeysRouter = router({
  // List API keys
  list: orgProcedure.query(async ({ ctx }) => {
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

  // Create API key
  create: adminProcedure
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

  // Revoke API key
  revoke: adminProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

  // Update API key usage timestamp
  updateUsage: orgProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
