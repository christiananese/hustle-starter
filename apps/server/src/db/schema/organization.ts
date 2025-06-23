import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  // Stripe integration fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status", {
    enum: [
      "active",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "past_due",
      "trialing",
      "unpaid",
    ],
  }),
  planTier: text("plan_tier", { enum: ["free", "basic", "pro", "enterprise"] })
    .notNull()
    .default("free"),
  // Audit fields
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // Flexible metadata for future features
  metadata: jsonb("metadata"),
});

export const organizationUser = pgTable("organization_user", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "member", "viewer"] })
    .notNull()
    .default("member"),
  // Invitation tracking
  invitedBy: text("invited_by").references(() => user.id),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at"),
  // Audit fields
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // Flexible metadata
  metadata: jsonb("metadata"),
});

export const organizationInvite = pgTable("organization_invite", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "member", "viewer"] })
    .notNull()
    .default("member"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  // Tracking
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id),
  acceptedBy: text("accepted_by").references(() => user.id),
  acceptedAt: timestamp("accepted_at"),
  // Audit fields
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // Flexible metadata
  metadata: jsonb("metadata"),
});

export const apiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // Security
  keyHash: text("key_hash").notNull(), // bcrypt hash of the actual key
  keyPrefix: text("key_prefix").notNull(), // e.g., "sk_live_" for display purposes
  // Permissions and scoping
  scopes: text("scopes").array(), // e.g., ["read:users", "write:data"]
  // Status and lifecycle
  isActive: text("is_active").notNull().default("true"),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  // Audit fields
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  revokedBy: text("revoked_by").references(() => user.id),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // Flexible metadata
  metadata: jsonb("metadata"),
});

// Webhook event tracking for idempotency
export const webhookEvent = pgTable("webhook_event", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(), // Stripe event ID
  eventType: text("event_type").notNull(),
  processed: text("processed").notNull().default("true"),
  processedAt: timestamp("processed_at").notNull(),
  // Store the raw event data for debugging
  eventData: jsonb("event_data"),
  // Error tracking
  error: text("error"),
  retryCount: text("retry_count").notNull().default("0"),
});
