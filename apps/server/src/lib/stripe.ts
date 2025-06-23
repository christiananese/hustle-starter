import Stripe from "stripe";

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
  typescript: true,
});

// Import plan configuration
export {
  formatPrice,
  getPlanById,
  getPlanByPriceId,
  isValidPlanId,
  PLANS,
  type Plan,
  type PlanId,
} from "./plans";

// Stripe service functions
export class StripeService {
  /**
   * Create a checkout session for a subscription
   */
  static async createCheckoutSession({
    customerId,
    priceId,
    orgId,
    successUrl,
    cancelUrl,
  }: {
    customerId?: string;
    priceId: string;
    orgId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orgId,
      },
      subscription_data: {
        metadata: {
          orgId,
        },
      },
    };

    // If customer exists, use it, otherwise let Stripe create one
    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_creation = "always";
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  /**
   * Create a customer portal session
   */
  static async createPortalSession({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Create a Stripe customer
   */
  static async createCustomer({
    email,
    name,
    orgId,
  }: {
    email: string;
    name: string;
    orgId: string;
  }): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        orgId,
      },
    });
  }

  /**
   * Update a subscription
   */
  static async updateSubscription({
    subscriptionId,
    priceId,
  }: {
    subscriptionId: string;
    priceId: string;
  }): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: "create_prorations",
    });
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription({
    subscriptionId,
    immediately = false,
  }: {
    subscriptionId: string;
    immediately?: boolean;
  }): Promise<Stripe.Subscription> {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice", "customer"],
    });
  }

  /**
   * Get customer details
   */
  static async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  }

  /**
   * Construct webhook event
   */
  static constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
