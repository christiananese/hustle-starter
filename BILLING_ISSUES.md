# Billing System - Potential Issues & Solutions

## Critical Issues Identified

### 1. Environment Variable Runtime Failures ⚠️

**Issue**: Server crashes if Stripe price IDs are missing
**Status**: ✅ FIXED
**Solution**: Added graceful handling with warnings instead of crashes

### 2. Database Schema Inconsistency ✅ FIXED

**Issue**: `organizationSubscription` table defined but unused
**Status**: ✅ COMPLETED - Unused table removed and migration applied
**Solution**: Removed the unused table and created proper webhook event tracking table

### 3. Webhook Security Gaps

**Issues**:

- No rate limiting on webhook endpoint
- No IP allowlist for Stripe webhooks
- No duplicate event handling (idempotency)

**Recommendations**:

```typescript
// Add to webhook handler
const processedEvents = new Set(); // In production, use Redis
if (processedEvents.has(event.id)) {
  return; // Already processed
}
processedEvents.add(event.id);
```

### 4. Race Condition in Webhooks

**Issue**: Webhook events might be processed out of order
**Impact**: Data inconsistencies if subscription updates arrive before creation
**Solution**: Implement event ordering or database transactions

### 5. Incomplete Error Recovery

**Issue**: If Stripe operations succeed but database updates fail, no cleanup
**Example**: Subscription created in Stripe but not saved to database
**Solution**: Implement proper transaction handling and cleanup mechanisms

### 6. Performance Issues

**Issues**:

- Dynamic imports in TRPC routes cause latency
- No caching of plan data
- Multiple database queries in webhook handlers

**Solutions**:

```typescript
// Cache plans at startup
let CACHED_PLANS: Plan[] | null = null;
export async function getCachedPlans() {
  if (!CACHED_PLANS) {
    CACHED_PLANS = await loadPlans();
  }
  return CACHED_PLANS;
}
```

### 7. Missing Validation

**Issues**:

- No validation that Stripe customer belongs to organization
- No verification of webhook event authenticity beyond signature
- No plan limits enforcement

### 8. Type Safety Issues ✅ FIXED

**Issue**: Frontend used `any` types reducing type safety
**Status**: Fixed by removing explicit `any` types

## Security Recommendations

### 1. Webhook IP Allowlist

```typescript
const STRIPE_IPS = [
  "3.18.12.63",
  "3.130.192.231",
  "13.235.14.237",
  // ... other Stripe IPs
];

// In webhook handler
const clientIP = c.req.header("x-forwarded-for") || c.req.header("x-real-ip");
if (!STRIPE_IPS.includes(clientIP)) {
  return c.json({ error: "Unauthorized" }, 401);
}
```

### 2. Rate Limiting

```typescript
// Add rate limiting middleware
app.use(
  "/api/stripe/webhook",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);
```

### 3. Idempotency ✅ IMPLEMENTED

```typescript
// Database schema for tracking processed events
export const webhookEvent = pgTable("webhook_event", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(), // Stripe event ID
  eventType: text("event_type").notNull(),
  processed: text("processed").notNull().default("true"),
  processedAt: timestamp("processed_at").notNull(),
  eventData: jsonb("event_data"), // Store raw event for debugging
  error: text("error"),
  retryCount: text("retry_count").notNull().default("0"),
});

// In webhook handler - check for existing events before processing
const existingEvent = await db
  .select()
  .from(webhookEvent)
  .where(eq(webhookEvent.eventId, event.id))
  .limit(1);

if (existingEvent.length > 0) {
  console.log(`Event ${event.id} already processed, skipping`);
  return;
}

// Record event before processing
await db.insert(webhookEvent).values({
  id: crypto.randomUUID(),
  eventId: event.id,
  eventType: event.type,
  processedAt: new Date(),
  eventData: event as any,
});
```

## Business Logic Issues

### 1. Plan Limits Not Enforced

**Issue**: Users can exceed plan limits (API keys, members)
**Solution**: Implement middleware to check limits before operations

### 2. Subscription Downgrade Handling

**Issue**: No handling of what happens to excess resources when downgrading
**Example**: User has 50 API keys, downgrades to Basic (25 limit)

### 3. Failed Payment Handling

**Issue**: No automated handling of failed payments
**Needs**: Grace period, retry logic, account suspension

## Monitoring & Observability

### 1. Missing Metrics

- Subscription conversion rates
- Payment failure rates
- Webhook processing times
- Plan usage statistics

### 2. Alerting Gaps

- Failed webhook processing
- Subscription cancellations
- Payment failures
- Plan limit violations

## Recommended Fixes Priority

### High Priority

1. ✅ Environment variable handling (FIXED)
2. ✅ Webhook error handling improvements (FIXED)
3. ✅ Implement idempotency for webhooks (IMPLEMENTED)
4. ✅ Remove unused database schema (COMPLETED)
5. 📋 Add plan limits enforcement (EXAMPLES PROVIDED)
6. Improve error recovery mechanisms

### Medium Priority

1. Add webhook IP allowlist
2. Implement rate limiting
3. Add comprehensive monitoring

### Low Priority

1. Performance optimizations
2. Enhanced security measures
3. Better user experience improvements

## Testing Recommendations

### 1. Webhook Testing

```bash
# Use Stripe CLI to test webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

### 2. Integration Tests

- Test subscription lifecycle
- Test webhook event handling
- Test error scenarios
- Test plan limit enforcement

### 3. Load Testing

- Webhook endpoint under load
- Concurrent subscription operations
- Database performance under load

## Environment Variables Checklist

Required for production:

- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_BASIC_PRICE_ID`
- [ ] `STRIPE_PRO_PRICE_ID`
- [ ] `CORS_ORIGIN`

Optional but recommended:

- [ ] `STRIPE_PUBLISHABLE_KEY` (frontend)
- [ ] `DATABASE_URL`
- [ ] `REDIS_URL` (for caching/rate limiting)

## Plan Limits Enforcement Examples

**Note**: This is a starter template. The actual implementation of plan limits will vary depending on your app's specific use case and requirements.

### 1. Middleware-Based Approach

```typescript
// apps/server/src/lib/plan-limits.ts
import { db, organization, apiKey, organizationUser } from "../db";
import { eq, count } from "drizzle-orm";
import { PLANS } from "./plans";

export async function checkPlanLimits(orgId: string, resource: string) {
  // Get organization's current plan
  const [org] = await db
    .select({ planTier: organization.planTier })
    .from(organization)
    .where(eq(organization.id, orgId));

  if (!org) throw new Error("Organization not found");

  const plan = PLANS[org.planTier];
  const limits = plan.limits;

  switch (resource) {
    case "api_keys":
      if (limits.apiKeys === -1) return true; // Unlimited

      const [apiKeyCount] = await db
        .select({ count: count() })
        .from(apiKey)
        .where(eq(apiKey.organizationId, orgId));

      if (apiKeyCount.count >= limits.apiKeys) {
        throw new Error(
          `Plan limit reached: ${limits.apiKeys} API keys maximum`
        );
      }
      break;

    case "members":
      if (limits.members === -1) return true; // Unlimited

      const [memberCount] = await db
        .select({ count: count() })
        .from(organizationUser)
        .where(eq(organizationUser.organizationId, orgId));

      if (memberCount.count >= limits.members) {
        throw new Error(
          `Plan limit reached: ${limits.members} members maximum`
        );
      }
      break;

    case "projects":
      if (limits.projects === -1) return true; // Unlimited
      // Implement project counting logic based on your schema
      break;
  }

  return true;
}

// Usage in TRPC procedures
export const planLimitProcedure = orgProcedure.use(async ({ ctx, next }) => {
  // This middleware can be applied to specific routes that need limit checking
  return next({ ctx });
});
```

### 2. Resource-Specific Limit Checks

```typescript
// Example: API Key creation with limit check
createApiKey: adminProcedure
  .input(z.object({ name: z.string(), description: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    // Check plan limits before creating
    await checkPlanLimits(ctx.organizationId, "api_keys");

    // Proceed with creation...
    const newKey = await db.insert(apiKey).values({
      // ... key creation logic
    });

    return newKey;
  }),

// Example: Member invitation with limit check
inviteUser: adminProcedure
  .input(z.object({ email: z.string().email(), role: z.enum(["admin", "member", "viewer"]) }))
  .mutation(async ({ ctx, input }) => {
    // Check if adding this member would exceed limits
    await checkPlanLimits(ctx.organizationId, "members");

    // Proceed with invitation...
  }),
```

### 3. Usage-Based Limits (Advanced)

```typescript
// For apps with usage-based features (API calls, storage, etc.)
export interface UsageLimits {
  apiCalls: number; // per month
  storage: number; // in GB
  bandwidth: number; // in GB
}

// Track usage in separate table
export const organizationUsage = pgTable("organization_usage", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organization.id),
  month: text("month").notNull(), // YYYY-MM format
  apiCalls: text("api_calls").notNull().default("0"),
  storageUsed: text("storage_used").notNull().default("0"),
  bandwidthUsed: text("bandwidth_used").notNull().default("0"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Usage checking function
export async function checkUsageLimits(
  orgId: string,
  usageType: keyof UsageLimits
) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [org] = await db
    .select({ planTier: organization.planTier })
    .from(organization)
    .where(eq(organization.id, orgId));

  const [usage] = await db
    .select()
    .from(organizationUsage)
    .where(
      and(
        eq(organizationUsage.organizationId, orgId),
        eq(organizationUsage.month, currentMonth)
      )
    );

  const plan = PLANS[org.planTier];
  const usageLimits = plan.usageLimits; // Add this to your plan configuration

  if (usage && usageLimits) {
    const currentUsage = parseInt(usage[usageType]);
    const limit = usageLimits[usageType];

    if (limit !== -1 && currentUsage >= limit) {
      throw new Error(`Usage limit exceeded for ${usageType}`);
    }
  }
}
```

### 4. Frontend Plan Limit Display

```typescript
// Component to show plan limits and current usage
export function PlanLimitsDisplay({ orgId }: { orgId: string }) {
  const { data: subscription } = useQuery({
    ...trpc.getCurrentSubscription.queryOptions(),
  });

  const { data: usage } = useQuery({
    ...trpc.getOrganizationUsage.queryOptions({ orgId }),
  });

  const currentPlan = PLANS[subscription?.planTier || "free"];

  return (
    <div className="space-y-4">
      <h3>Plan Limits</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LimitCard
          title="API Keys"
          current={usage?.apiKeys || 0}
          limit={currentPlan.limits.apiKeys}
        />
        <LimitCard
          title="Team Members"
          current={usage?.members || 0}
          limit={currentPlan.limits.members}
        />
        <LimitCard
          title="Projects"
          current={usage?.projects || 0}
          limit={currentPlan.limits.projects}
        />
      </div>
    </div>
  );
}

function LimitCard({ title, current, limit }: {
  title: string;
  current: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : (current / limit) * 100;
  const isNearLimit = percentage > 80;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">{title}</h4>
          <Badge variant={isNearLimit ? "destructive" : "default"}>
            {current} / {isUnlimited ? "∞" : limit}
          </Badge>
        </div>

        {!isUnlimited && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                isNearLimit ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 5. Graceful Limit Handling

```typescript
// Handle limit exceeded scenarios gracefully
export function handleLimitExceeded(error: Error, planTier: string) {
  if (error.message.includes("Plan limit reached")) {
    // Show upgrade prompt
    return {
      type: "LIMIT_EXCEEDED",
      message: error.message,
      action: "UPGRADE_PLAN",
      currentPlan: planTier,
      suggestedPlan: planTier === "free" ? "basic" : "pro",
    };
  }

  // Handle other errors normally
  throw error;
}

// In your frontend error handling
const createApiKey = useMutation({
  mutationFn: trpc.createApiKey.mutate,
  onError: (error) => {
    const handled = handleLimitExceeded(error, currentPlan);
    if (handled.type === "LIMIT_EXCEEDED") {
      // Show upgrade dialog
      setShowUpgradeDialog(true);
      setUpgradeReason(handled.message);
    } else {
      toast.error(error.message);
    }
  },
});
```

### Implementation Notes

1. **Flexibility**: Plan limits should be configurable and easy to modify
2. **Performance**: Cache limit checks where possible to avoid database hits
3. **User Experience**: Show limits proactively, not just when exceeded
4. **Granular Control**: Different limits for different features/resources
5. **Upgrade Path**: Make it easy for users to upgrade when they hit limits

Choose the approach that best fits your application's architecture and requirements.
