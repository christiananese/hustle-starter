import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, organization } from "../db";
import { createUserWithOrganization } from "../db/seed";
import {
  adminProcedure,
  orgProcedure,
  ownerProcedure,
  protectedProcedure,
  router,
} from "../lib/trpc";

export const organizationsRouter = router({
  // Create new organization
  create: protectedProcedure
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

      // Create organization with user as owner
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

  // Update organization settings
  update: adminProcedure
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

  // Delete organization
  delete: ownerProcedure.mutation(async ({ ctx }) => {
    await db
      .delete(organization)
      .where(eq(organization.id, ctx.organizationId));

    return { success: true };
  }),

  // Get organization data (example endpoint)
  data: orgProcedure.query(({ ctx }) => {
    return {
      message: "This is organization data",
      organizationId: ctx.organizationId,
      userRole: ctx.organizationAccess.role,
    };
  }),
});
