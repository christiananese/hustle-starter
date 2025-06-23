import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, organization, webhookEvent } from "../db";
import { getPlanByPriceId } from "./plans";
import { StripeService } from "./stripe";

export async function handleStripeWebhook(event: Stripe.Event) {
  console.log(`Processing webhook event: ${event.type} - ${event.id}`);

  // Check if event has already been processed (idempotency)
  const existingEvent = await db
    .select()
    .from(webhookEvent)
    .where(eq(webhookEvent.eventId, event.id))
    .limit(1);

  if (existingEvent.length > 0) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  // Record the event as being processed
  await db.insert(webhookEvent).values({
    id: crypto.randomUUID(),
    eventId: event.id,
    eventType: event.type,
    processedAt: new Date(),
    eventData: event as any, // Store raw event for debugging
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event);
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event);
        break;
      }

      case "invoice.payment_succeeded": {
        await handlePaymentSucceeded(event);
        break;
      }

      case "invoice.payment_failed": {
        await handlePaymentFailed(event);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);

    // Update the webhook event record with error details
    await db
      .update(webhookEvent)
      .set({
        error: error instanceof Error ? error.message : String(error),
        retryCount: "1", // In a real implementation, you'd increment this
      })
      .where(eq(webhookEvent.eventId, event.id));

    throw error; // Re-throw to return 400 to Stripe
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orgId = session.metadata?.orgId;

  if (!orgId) {
    throw new Error("No orgId in checkout session metadata");
  }

  if (!session.subscription) {
    throw new Error("No subscription in checkout session");
  }

  // Get subscription details
  const subscription = await StripeService.getSubscription(
    session.subscription as string
  );

  if (!subscription.items.data[0]?.price?.id) {
    throw new Error("No price ID found in subscription");
  }

  const planInfo = getPlanByPriceId(subscription.items.data[0].price.id);

  if (!planInfo) {
    throw new Error(`Unknown price ID: ${subscription.items.data[0].price.id}`);
  }

  // Update organization with subscription details
  const result = await db
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
    .where(eq(organization.id, orgId))
    .returning({ id: organization.id });

  if (!result.length) {
    throw new Error(`Organization ${orgId} not found`);
  }

  console.log(`Subscription created for org ${orgId}: ${planInfo.planId}`);
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const orgId = subscription.metadata?.orgId;

  if (!orgId) {
    // Try to find org by subscription ID
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.stripeSubscriptionId, subscription.id));

    if (!org) {
      throw new Error(
        `Cannot find organization for subscription: ${subscription.id}`
      );
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
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceId ? getPlanByPriceId(priceId) : null;

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
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // Find organization by subscription ID
  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeSubscriptionId, subscription.id));

  if (!org) {
    throw new Error(
      `Cannot find organization for deleted subscription: ${subscription.id}`
    );
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
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
  // TODO: Handle successful payments (send confirmation emails, etc.)
}

async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  console.log(`Payment failed for invoice: ${invoice.id}`);
  // TODO: Handle failed payments (send emails, update status, etc.)
}
