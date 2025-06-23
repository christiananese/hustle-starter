import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../../db";
import {
  organization,
  organizationUser,
} from "../../../db/schema/organization";
import { getApiKeyContext, requireApiKey } from "../../../lib/api-key-auth";

const app = new Hono();

/**
 * GET /api/v1/organizations/current
 * Get current organization details using API key
 *
 * Example usage:
 * curl -H "Authorization: Bearer sk_test_..." http://localhost:3000/api/v1/organizations/current
 */
app.get(
  "/current",
  requireApiKey({
    rateLimit: { requests: 100, window: "1h" }, // 100 requests per hour per API key
  }),
  async (c) => {
    try {
      const { organizationId } = getApiKeyContext(c);

      // Get organization details
      const [org] = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          website: organization.website,
          planTier: organization.planTier,
          subscriptionStatus: organization.subscriptionStatus,
          createdAt: organization.createdAt,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (!org) {
        return c.json({ error: "Organization not found" }, 404);
      }

      return c.json({
        success: true,
        data: {
          organization: org,
        },
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

/**
 * GET /api/v1/organizations/members
 * Get organization members using API key
 *
 * Example usage:
 * curl -H "Authorization: Bearer sk_test_..." http://localhost:3000/api/v1/organizations/members
 */
app.get(
  "/members",
  requireApiKey({
    rateLimit: { requests: 50, window: "1h" }, // 50 requests per hour per API key
  }),
  async (c) => {
    try {
      const { organizationId } = getApiKeyContext(c);

      // Get organization members
      const members = await db
        .select({
          id: organizationUser.id,
          role: organizationUser.role,
          joinedAt: organizationUser.joinedAt,
          createdAt: organizationUser.createdAt,
        })
        .from(organizationUser)
        .where(eq(organizationUser.organizationId, organizationId));

      return c.json({
        success: true,
        data: {
          members,
          total: members.length,
        },
      });
    } catch (error) {
      console.error("Error fetching members:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

/**
 * GET /api/v1/organizations/stats
 * Get organization statistics (example of different rate limit)
 *
 * Example usage:
 * curl -H "Authorization: Bearer sk_test_..." http://localhost:3000/api/v1/organizations/stats
 */
app.get(
  "/stats",
  requireApiKey({
    rateLimit: { requests: 10, window: "5m" }, // 10 requests per 5 minutes (expensive endpoint)
  }),
  async (c) => {
    try {
      const { organizationId, apiKeyLabel } = getApiKeyContext(c);

      // Get organization stats
      const [memberCount] = await db
        .select({ count: organizationUser.id })
        .from(organizationUser)
        .where(eq(organizationUser.organizationId, organizationId));

      return c.json({
        success: true,
        data: {
          organizationId,
          memberCount: memberCount?.count || 0,
          apiKeyUsed: apiKeyLabel,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

export { app as organizationsApi };
