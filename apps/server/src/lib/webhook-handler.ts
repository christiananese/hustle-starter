import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, organization } from "../db";
import { getPlanByPriceId } from "./plans";
import { StripeService } from "./stripe";

export async function handleStripeWebhook(event: Stripe.Event) {
  console.log(`Processing webhook event: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;

      if (!orgId) {
        console.error("No orgId in checkout session metadata");
        return;
      }

      if (!session.subscription) {
        console.error("No subscription in checkout session");
        return;
      }

      // Get subscription details
      const subscription = await StripeService.getSubscription(
        session.subscription as string
      );
      const planInfo = getPlanByPriceId(subscription.items.data[0].price.id);

      if (!planInfo) {
        console.error("Unknown price ID:", subscription.items.data[0].price.id);
        return;
      }

      // Update organization with subscription details
      await db
        .update(organization)
        .set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status as
            | "active"
            | "canceled"
            | "incomplete"
            | "incomplete_expired"
            | "past_due"
            | "trialing"
            | "unpaid",
          planTier: planInfo.planId,
          updatedAt: new Date(),
        })
        .where(eq(organization.id, orgId));

      console.log(`Subscription created for org ${orgId}: ${planInfo.planId}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;

      if (!orgId) {
        // Try to find org by subscription ID
        const [org] = await db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.stripeSubscriptionId, subscription.id));

        if (!org) {
          console.error(
            "Cannot find organization for subscription:",
            subscription.id
          );
          return;
        }

        // Update subscription status
        await db
          .update(organization)
          .set({
            subscriptionStatus: subscription.status as
              | "active"
              | "canceled"
              | "incomplete"
              | "incomplete_expired"
              | "past_due"
              | "trialing"
              | "unpaid",
            updatedAt: new Date(),
          })
          .where(eq(organization.id, org.id));
      } else {
        // Get plan info if price changed
        const planInfo = getPlanByPriceId(subscription.items.data[0].price.id);

        const updateData: any = {
          subscriptionStatus: subscription.status,
          updatedAt: new Date(),
        };

        if (planInfo) {
          updateData.planTier = planInfo.planId;
        }

        await db
          .update(organization)
          .set(updateData)
          .where(eq(organization.id, orgId));
      }

      console.log(`Subscription updated: ${subscription.id}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Find organization by subscription ID
      const [org] = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.stripeSubscriptionId, subscription.id));

      if (!org) {
        console.error(
          "Cannot find organization for deleted subscription:",
          subscription.id
        );
        return;
      }

      // Reset to free plan
      await db
        .update(organization)
        .set({
          planTier: "free",
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(organization.id, org.id));

      console.log(`Subscription deleted for org ${org.id}`);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment succeeded for invoice: ${invoice.id}`);
      // TODO: Handle successful payments (send confirmation emails, etc.)
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment failed for invoice: ${invoice.id}`);
      // TODO: Handle failed payments (send emails, update status, etc.)
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
