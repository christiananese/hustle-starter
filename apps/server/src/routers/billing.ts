import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, organization } from "../db";
import {
  adminProcedure,
  orgProcedure,
  ownerProcedure,
  router,
} from "../lib/trpc";

export const billingRouter = router({
  // Get current subscription
  getCurrentSubscription: orgProcedure.query(async ({ ctx }) => {
    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        planTier: organization.planTier,
        stripeCustomerId: organization.stripeCustomerId,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        subscriptionStatus: organization.subscriptionStatus,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org) {
      throw new Error("Organization not found");
    }

    return org;
  }),

  // Create Stripe checkout session
  createCheckoutSession: adminProcedure
    .input(z.object({ planId: z.enum(["basic", "pro"]) }))
    .mutation(async ({ ctx, input }) => {
      const { StripeService } = await import("../lib/stripe");
      const { PLANS } = await import("../lib/plans");

      const plan = PLANS[input.planId];
      if (!plan.priceId) {
        throw new Error(
          `${plan.name} plan is not available for checkout. Please contact support.`
        );
      }

      // Get organization details
      const [org] = await db
        .select({
          id: organization.id,
          name: organization.name,
          stripeCustomerId: organization.stripeCustomerId,
        })
        .from(organization)
        .where(eq(organization.id, ctx.organizationId));

      if (!org) {
        throw new Error("Organization not found");
      }

      // Create checkout session
      const session = await StripeService.createCheckoutSession({
        customerId: org.stripeCustomerId || undefined,
        priceId: plan.priceId,
        orgId: org.id,
        successUrl: `${process.env.CORS_ORIGIN}/${org.id}/settings/billing?success=true`,
        cancelUrl: `${process.env.CORS_ORIGIN}/${org.id}/settings/billing?canceled=true`,
      });

      return { url: session.url };
    }),

  // Create Stripe portal session
  createPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    const { StripeService } = await import("../lib/stripe");

    const [org] = await db
      .select({
        id: organization.id,
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    const session = await StripeService.createPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${process.env.CORS_ORIGIN}/${org.id}/settings/billing`,
    });

    return { url: session.url };
  }),

  // Cancel subscription
  cancelSubscription: ownerProcedure.mutation(async ({ ctx }) => {
    const { StripeService } = await import("../lib/stripe");

    const [org] = await db
      .select({
        id: organization.id,
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, ctx.organizationId));

    if (!org?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    await StripeService.cancelSubscription(org.stripeCustomerId);

    return { success: true };
  }),
});
