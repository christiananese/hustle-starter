import { and, eq } from "drizzle-orm";
import type { Context as HonoContext } from "hono";
import { db, organizationUser } from "../db";
import { auth } from "./auth";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  // Get organization ID from header for multi-tenant scoping
  const orgId = context.req.header("x-organization-id");

  // Verify user has access to the organization if orgId is provided
  let organizationAccess = null;
  if (session?.user?.id && orgId) {
    const [membership] = await db
      .select({
        organizationId: organizationUser.organizationId,
        role: organizationUser.role,
      })
      .from(organizationUser)
      .where(
        and(
          eq(organizationUser.userId, session.user.id),
          eq(organizationUser.organizationId, orgId)
        )
      );

    organizationAccess = membership || null;
  }

  return {
    session,
    organizationId: orgId,
    organizationAccess,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
