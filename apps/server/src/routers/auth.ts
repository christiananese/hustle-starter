import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, user } from "../db";
import { getUserOrganizations } from "../db/seed";
import { protectedProcedure, router } from "../lib/trpc";

export const authRouter = router({
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

  // User's organizations
  myOrganizations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserOrganizations(ctx.session.user.id);
  }),
});
