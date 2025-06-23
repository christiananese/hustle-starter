import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Context, Next } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { db } from "../db";
import { apiKey } from "../db/schema/organization";

export interface ApiKeyContext {
  organizationId: string;
  apiKeyId: string;
  apiKeyLabel: string;
}

export interface RateLimitOptions {
  requests: number;
  window: string; // e.g., "1h", "15m", "60s"
}

// Convert window string to milliseconds
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid window format: ${window}`);

  const [, amount, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount) * multipliers[unit as keyof typeof multipliers];
}

/**
 * Middleware to require API key authentication
 * Extracts API key from Authorization header and validates it
 */
export function requireApiKey(options?: { rateLimit?: RateLimitOptions }) {
  return async (c: Context, next: Next) => {
    // Extract API key from Authorization header
    const authHeader = c.req.header("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          error: "Unauthorized",
          message:
            "API key required. Use 'Authorization: Bearer <api_key>' header.",
        },
        401
      );
    }

    const providedKey = authHeader.slice(7); // Remove "Bearer "

    if (!providedKey) {
      return c.json(
        {
          error: "Unauthorized",
          message: "API key cannot be empty.",
        },
        401
      );
    }

    // Hash the provided key to compare with stored hash
    const hashedKey = crypto
      .createHash("sha256")
      .update(providedKey)
      .digest("hex");

    try {
      // Find the API key in database
      const [foundKey] = await db
        .select({
          id: apiKey.id,
          organizationId: apiKey.organizationId,
          name: apiKey.name,
          keyHash: apiKey.keyHash,
          expiresAt: apiKey.expiresAt,
          isActive: apiKey.isActive,
          revokedAt: apiKey.revokedAt,
        })
        .from(apiKey)
        .where(
          and(
            eq(apiKey.keyHash, hashedKey),
            eq(apiKey.isActive, "true"),
            isNull(apiKey.revokedAt)
          )
        )
        .limit(1);

      if (!foundKey) {
        return c.json(
          {
            error: "Unauthorized",
            message: "Invalid API key.",
          },
          401
        );
      }

      // Check if key is expired
      if (foundKey.expiresAt && foundKey.expiresAt < new Date()) {
        return c.json(
          {
            error: "Unauthorized",
            message: "API key has expired.",
          },
          401
        );
      }

      // Set API key context for use in handlers and rate limiting
      const apiKeyContext: ApiKeyContext = {
        organizationId: foundKey.organizationId,
        apiKeyId: foundKey.id,
        apiKeyLabel: foundKey.name,
      };

      // Store context in Hono context
      c.set("apiKey", apiKeyContext);

      // Apply rate limiting if configured
      if (options?.rateLimit) {
        const limiter = rateLimiter({
          windowMs: parseWindow(options.rateLimit.window),
          limit: options.rateLimit.requests,
          standardHeaders: "draft-6",
          keyGenerator: () => foundKey.id, // Use API key ID for rate limiting
          message: "Rate limit exceeded",
          handler: (c) => {
            return c.json(
              {
                error: "Too many requests",
                message: `Rate limit exceeded. Maximum ${options.rateLimit!.requests} requests per ${options.rateLimit!.window}.`,
              },
              429
            );
          },
        });

        return await limiter(c, next);
      }

      await next();
    } catch (error) {
      console.error("API key authentication error:", error);
      return c.json(
        {
          error: "Internal Server Error",
          message: "Authentication failed.",
        },
        500
      );
    }
  };
}

/**
 * Get API key context from request
 * Use this in your handlers to access organization info
 */
export function getApiKeyContext(c: Context): ApiKeyContext {
  const apiKeyContext = c.get("apiKey") as ApiKeyContext;
  if (!apiKeyContext) {
    throw new Error(
      "API key context not found. Make sure requireApiKey middleware is used."
    );
  }
  return apiKeyContext;
}
