import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  organization,
  organizationInvite,
  organizationUser,
  user,
} from "../db";
import {
  adminProcedure,
  orgProcedure,
  publicProcedure,
  router,
} from "../lib/trpc";

export const invitesRouter = router({
  // Create invite
  create: adminProcedure
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

      // Check for existing pending invite
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
        .select({ id: organization.id, name: organization.name })
        .from(organization)
        .where(eq(organization.id, ctx.organizationId));

      const [inviter] = await db
        .select({ name: user.name, email: user.email })
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
      }

      return invite;
    }),

  // List invites
  list: orgProcedure.query(async ({ ctx }) => {
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

  // Resend invite
  resend: adminProcedure
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

  // Revoke invite
  revoke: adminProcedure
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

  // Accept invite (public route)
  accept: publicProcedure
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

      return {
        email: invite.email,
        role: invite.role,
        organizationId: invite.organizationId,
        organizationName: org?.name || "Unknown Organization",
        inviteId: invite.id,
      };
    }),

  // Complete invite acceptance
  completeAcceptance: publicProcedure
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
          .select({ id: user.id, name: user.name, email: user.email })
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
