import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Organization-scoped procedure - requires x-organization-id header and membership
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization ID required",
      cause: "Missing x-organization-id header",
    });
  }

  if (!ctx.organizationAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied to organization",
      cause: "User is not a member of the organization",
    });
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId,
      organizationAccess: ctx.organizationAccess,
    },
  });
});

// Role-based procedures for different levels of access
export const adminProcedure = orgProcedure.use(({ ctx, next }) => {
  const { role } = ctx.organizationAccess;

  if (role !== "admin" && role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
      cause: `User role '${role}' is insufficient`,
    });
  }

  return next({ ctx });
});

export const ownerProcedure = orgProcedure.use(({ ctx, next }) => {
  const { role } = ctx.organizationAccess;

  if (role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner access required",
      cause: `User role '${role}' is insufficient`,
    });
  }

  return next({ ctx });
});
