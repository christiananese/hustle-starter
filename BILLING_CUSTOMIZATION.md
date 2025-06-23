# 🎛️ Billing Customization Guide

This guide explains how to customize billing plans, features, and restrictions in your SaaS application.

## 📋 Plan Configuration

### Current Plan Structure

The application is configured with three tiers:

```typescript
// Located in: apps/server/src/lib/stripe.ts
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    features: ["Up to 3 API keys", "Up to 2 team members", "Community support"],
    limits: {
      apiKeys: 3,
      members: 2,
      projects: 1,
    },
  },
  basic: {
    name: "Basic",
    price: 29900, // $299.00 in cents
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      "Up to 25 API keys",
      "Up to 10 team members",
      "Email support",
      "Basic analytics",
    ],
    limits: {
      apiKeys: 25,
      members: 10,
      projects: 5,
    },
  },
  pro: {
    name: "Pro",
    price: 49900, // $499.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "Unlimited API keys",
      "Unlimited team members",
      "Priority support",
      "Advanced analytics",
      "Custom integrations",
    ],
    limits: {
      apiKeys: -1, // -1 = unlimited
      members: -1,
      projects: -1,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: null, // Custom pricing
    priceId: null,
    features: [
      "Everything in Pro",
      "Dedicated support",
      "SLA guarantee",
      "Custom features",
      "On-premise deployment",
    ],
    limits: {
      apiKeys: -1,
      members: -1,
      projects: -1,
    },
    isCustom: true,
  },
};
```

---

## 🔧 Customizing Plans

### Adding a New Plan

1. **Update Plan Configuration**:

```typescript
// In apps/server/src/lib/stripe.ts
export const PLANS = {
  // ... existing plans
  startup: {
    name: "Startup",
    price: 9900, // $99.00
    priceId: process.env.STRIPE_STARTUP_PRICE_ID,
    features: ["Up to 10 API keys", "Up to 5 team members", "Email support"],
    limits: {
      apiKeys: 10,
      members: 5,
      projects: 3,
    },
  },
};
```

2. **Add Environment Variable**:

```bash
# In .env
STRIPE_STARTUP_PRICE_ID=price_your_startup_plan_id
```

3. **Update Database Schema** (if needed):

```sql
-- Add new plan tier to enum
ALTER TYPE plan_tier_enum ADD VALUE 'startup';
```

4. **Update Frontend Components**:

```typescript
// In plan selection component
const planOrder = ["free", "startup", "basic", "pro", "enterprise"];
```

### Modifying Existing Plans

#### Changing Prices

1. **Create new price in Stripe Dashboard**
2. **Update environment variable** with new price ID
3. **Restart application**

#### Changing Features

```typescript
// Update the features array
basic: {
  // ... other config
  features: [
    "Up to 25 API keys",
    "Up to 10 team members",
    "Email support",
    "Basic analytics",
    "New feature here", // Add new feature
  ];
}
```

#### Changing Limits

```typescript
// Update the limits object
basic: {
  // ... other config
  limits: {
    apiKeys: 50, // Increase from 25 to 50
    members: 15, // Increase from 10 to 15
    projects: 10, // Increase from 5 to 10
    storage: 1000 // Add new limit type
  }
}
```

---

## 🚧 Implementing Usage Limits

### Backend Enforcement

Create limit checking utilities:

```typescript
// apps/server/src/lib/plan-limits.ts
import { PLANS } from "./stripe";
import { db, organization, apiKey, organizationUser } from "../db";
import { eq, and, count } from "drizzle-orm";

export async function checkPlanLimit(
  orgId: string,
  limitType: keyof typeof PLANS.basic.limits,
  increment: number = 1
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Get organization plan
  const [org] = await db
    .select({ planTier: organization.planTier })
    .from(organization)
    .where(eq(organization.id, orgId));

  if (!org) throw new Error("Organization not found");

  const plan = PLANS[org.planTier as keyof typeof PLANS];
  const limit = plan.limits[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Get current usage
  let current = 0;
  switch (limitType) {
    case "apiKeys":
      const [apiKeyCount] = await db
        .select({ count: count() })
        .from(apiKey)
        .where(
          and(eq(apiKey.organizationId, orgId), eq(apiKey.isActive, "true"))
        );
      current = apiKeyCount.count;
      break;

    case "members":
      const [memberCount] = await db
        .select({ count: count() })
        .from(organizationUser)
        .where(eq(organizationUser.organizationId, orgId));
      current = memberCount.count;
      break;
  }

  const allowed = current + increment <= limit;
  return { allowed, current, limit };
}
```

### TRPC Middleware

Add limit checking to relevant procedures:

```typescript
// In your TRPC routes
createApiKey: adminProcedure
  .input(z.object({ name: z.string(), description: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    // Check plan limits
    const limitCheck = await checkPlanLimit(ctx.organizationId, "apiKeys");

    if (!limitCheck.allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Plan limit reached. You can create up to ${limitCheck.limit} API keys. Upgrade your plan for more.`,
      });
    }

    // ... rest of API key creation logic
  });
```

### Frontend Limit Display

Show usage and limits in the UI:

```typescript
// Usage component
function UsageDisplay({ orgId }: { orgId: string }) {
  const { data: usage } = useQuery({
    ...trpc.getUsageStats.queryOptions({ orgId })
  });

  const { data: org } = useQuery({
    ...trpc.getCurrentOrganization.queryOptions()
  });

  const plan = PLANS[org?.planTier as keyof typeof PLANS];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage & Limits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <UsageBar
            label="API Keys"
            current={usage?.apiKeys || 0}
            limit={plan?.limits.apiKeys}
          />
          <UsageBar
            label="Team Members"
            current={usage?.members || 0}
            limit={plan?.limits.members}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, current, limit }: {
  label: string;
  current: number;
  limit: number;
}) {
  const percentage = limit === -1 ? 0 : (current / limit) * 100;
  const isUnlimited = limit === -1;

  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {current} {isUnlimited ? '' : `/ ${limit}`}
          {isUnlimited && <span className="text-muted-foreground ml-1">(unlimited)</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className={`h-2 rounded-full ${
              percentage > 90 ? 'bg-red-500' :
              percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Frontend Customization

### Plan Selection Component

```typescript
// apps/web/src/components/plan-selector.tsx
import { PLANS } from '@/lib/plans';

export function PlanSelector({ currentPlan, onSelectPlan }: {
  currentPlan: string;
  onSelectPlan: (planId: string) => void;
}) {
  const planOrder = ['free', 'basic', 'pro', 'enterprise'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {planOrder.map(planId => {
        const plan = PLANS[planId as keyof typeof PLANS];
        const isCurrentPlan = currentPlan === planId;
        const isPopular = planId === 'pro';

        return (
          <PlanCard
            key={planId}
            plan={plan}
            planId={planId}
            isCurrentPlan={isCurrentPlan}
            isPopular={isPopular}
            onSelect={() => onSelectPlan(planId)}
          />
        );
      })}
    </div>
  );
}
```

### Plan Card Component

```typescript
function PlanCard({ plan, planId, isCurrentPlan, isPopular, onSelect }: {
  plan: typeof PLANS.basic;
  planId: string;
  isCurrentPlan: boolean;
  isPopular: boolean;
  onSelect: () => void;
}) {
  return (
    <Card className={`relative ${isPopular ? 'border-primary' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
            Most Popular
          </span>
        </div>
      )}

      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <div className="text-3xl font-bold">
          {plan.price === null ? (
            <span>Custom</span>
          ) : plan.price === 0 ? (
            <span>Free</span>
          ) : (
            <>
              ${(plan.price / 100).toFixed(0)}
              <span className="text-lg font-normal text-muted-foreground">/month</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              {feature}
            </li>
          ))}
        </ul>

        <Button
          className="w-full mt-6"
          variant={isCurrentPlan ? "outline" : "default"}
          onClick={onSelect}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' :
           plan.isCustom ? 'Contact Sales' : 'Select Plan'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🔄 Migration Strategies

### Grandfathering Existing Customers

```typescript
// Add grandfathered field to organization table
export const organization = pgTable("organization", {
  // ... existing fields
  isGrandfathered: boolean("is_grandfathered").default(false),
  grandfatheredPlan: text("grandfathered_plan"),
  grandfatheredLimits: jsonb("grandfathered_limits"),
});

// Check grandfathered status in limit checking
export async function checkPlanLimit(orgId: string, limitType: string) {
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, orgId));

  // Use grandfathered limits if applicable
  if (org.isGrandfathered && org.grandfatheredLimits) {
    const limit = org.grandfatheredLimits[limitType];
    // ... use grandfathered limit
  }

  // ... normal limit checking
}
```

### Plan Upgrades/Downgrades

```typescript
// Handle plan changes with proration
export async function changePlan(orgId: string, newPlanId: string) {
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, orgId));

  if (!org.stripeSubscriptionId) {
    throw new Error("No active subscription");
  }

  const newPlan = PLANS[newPlanId as keyof typeof PLANS];

  // Update subscription in Stripe
  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        price: newPlan.priceId,
      },
    ],
    proration_behavior: "create_prorations",
  });

  // Update organization
  await db
    .update(organization)
    .set({
      planTier: newPlanId,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, orgId));
}
```

---

## 📊 Analytics & Reporting

### Track Plan Metrics

```typescript
// Add plan analytics
export async function getPlanAnalytics() {
  const stats = await db
    .select({
      planTier: organization.planTier,
      count: count(),
      revenue: sum(organization.monthlyRevenue),
    })
    .from(organization)
    .groupBy(organization.planTier);

  return stats;
}
```

### Usage Analytics

```typescript
// Track feature usage by plan
export async function getUsageByPlan() {
  const usage = await db
    .select({
      planTier: organization.planTier,
      avgApiKeys: avg(apiKeyCount),
      avgMembers: avg(memberCount),
    })
    .from(organization)
    .leftJoin(/* ... usage aggregation queries */);

  return usage;
}
```

---

## 🚀 Best Practices

### 1. Gradual Rollouts

- Test plan changes with small user groups
- Monitor metrics closely after changes
- Have rollback plans ready

### 2. Communication

- Notify users before plan changes
- Provide migration guides
- Offer grandfathering for existing customers

### 3. Flexibility

- Make limits configurable
- Support custom enterprise plans
- Allow temporary limit increases

### 4. Monitoring

- Track plan conversion rates
- Monitor usage patterns
- Set up alerts for limit violations

---

This guide provides the foundation for customizing your billing system. For specific implementation details, refer to the code examples and adapt them to your needs.
