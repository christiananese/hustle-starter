// Plan configuration
function getStripePrice(envVar: string, planName: string): string | null {
  const priceId = process.env[envVar];
  if (!priceId) {
    console.warn(
      `Warning: ${envVar} not set. ${planName} plan will not be available for checkout.`
    );
    return null;
  }
  return priceId;
}

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
    priceId: getStripePrice("STRIPE_BASIC_PRICE_ID", "Basic"),
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
    priceId: getStripePrice("STRIPE_PRO_PRICE_ID", "Pro"),
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
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

// Helper functions
export function getPlanById(planId: string): Plan | null {
  return PLANS[planId as PlanId] || null;
}

export function getPlanByPriceId(
  priceId: string
): { planId: PlanId; plan: Plan } | null {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return { planId: planId as PlanId, plan };
    }
  }
  return null;
}

export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(0)}`;
}

export function isValidPlanId(planId: string): planId is PlanId {
  return planId in PLANS;
}
