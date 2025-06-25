import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, organizationUser, user } from "../db";
import { adminProcedure, orgProcedure, router } from "../lib/trpc";

export const membersRouter = router({
  // List organization users
  list: orgProcedure.query(async ({ ctx }) => {
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

  // Update user role
  updateRole: adminProcedure
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

  // Remove user from organization
  remove: adminProcedure
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
});
