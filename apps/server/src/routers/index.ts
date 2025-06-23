import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, organization, user } from "../db";
import { createUserWithOrganization, getUserOrganizations } from "../db/seed";
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
});

export type AppRouter = typeof appRouter;
