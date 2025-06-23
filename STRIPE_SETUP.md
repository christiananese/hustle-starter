# 💳 Stripe Billing Setup Guide

This guide will help you set up Stripe billing integration for your SaaS application with subscription plans.

## 📋 Prerequisites

1. A Stripe account (sign up at [stripe.com](https://stripe.com))
2. Access to your Stripe dashboard
3. Your application deployed or running locally with webhook capability

---

## 🏗️ Plan Structure

This starter includes three subscription tiers:

- **Basic**: $299/month - Perfect for small teams
- **Pro**: $499/month - For growing businesses
- **Enterprise**: Custom pricing - Bespoke solutions

---

## 🔧 Stripe Dashboard Setup

### Step 1: Create Products and Prices

1. **Navigate to Products** in your Stripe dashboard
2. **Create Basic Plan**:
   - Click "Add product"
   - Name: "Basic Plan"
   - Description: "Perfect for small teams getting started"
   - Pricing model: "Standard pricing"
   - Price: $299.00
   - Billing period: Monthly
   - Currency: USD
   - Save and copy the **Price ID** (starts with `price_`)

3. **Create Pro Plan**:
   - Click "Add product"
   - Name: "Pro Plan"
   - Description: "For growing businesses that need more power"
   - Pricing model: "Standard pricing"
   - Price: $499.00
   - Billing period: Monthly
   - Currency: USD
   - Save and copy the **Price ID** (starts with `price_`)

4. **Enterprise Plan**: No Stripe product needed (custom pricing handled separately)

### Step 2: Get API Keys

1. **Navigate to Developers > API Keys**
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

### Step 3: Set Up Webhooks

1. **Navigate to Developers > Webhooks**
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
4. **Listen to**: Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.created`
5. Save and copy the **Webhook signing secret** (starts with `whsec_`)

---

## 🔐 Environment Variables

Add these variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Plan Price IDs (from Step 1)
STRIPE_BASIC_PRICE_ID=price_your_basic_plan_price_id
STRIPE_PRO_PRICE_ID=price_your_pro_plan_price_id

# Enterprise Contact (optional)
ENTERPRISE_CONTACT_EMAIL=sales@yourcompany.com
ENTERPRISE_CONTACT_URL=https://yourcompany.com/contact-sales
```

---

## 🧪 Testing Setup

### Test Mode

- Use test API keys (starting with `sk_test_` and `pk_test_`)
- Use test webhook endpoint for development
- Test cards: Use Stripe's [test card numbers](https://stripe.com/docs/testing#cards)

### Common Test Cards

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Require 3D Secure**: `4000002500003155`

---

## 🚀 Production Deployment

### Before Going Live

1. **Replace test keys** with live keys (starting with `sk_live_` and `pk_live_`)
2. **Update webhook endpoint** to your production URL
3. **Test the complete flow** with real payment methods
4. **Set up monitoring** for failed payments and webhook errors

### Security Checklist

- ✅ Never expose secret keys in frontend code
- ✅ Validate webhook signatures
- ✅ Use HTTPS for all webhook endpoints
- ✅ Store sensitive data securely
- ✅ Implement proper error handling

---

## 🎛️ Customizing Plans

### Changing Prices

1. **In Stripe Dashboard**:
   - Go to Products
   - Edit your product
   - Create a new price (don't delete the old one)
   - Copy the new Price ID

2. **In Your Application**:
   - Update the `STRIPE_BASIC_PRICE_ID` or `STRIPE_PRO_PRICE_ID` in your environment variables
   - Restart your application

### Adding New Plans

1. **Create new product** in Stripe Dashboard
2. **Add environment variable** for the new price ID
3. **Update plan configuration** in `apps/server/src/lib/stripe.ts`
4. **Update frontend UI** to show the new plan

### Enterprise Plan Setup

The Enterprise plan uses custom pricing and doesn't go through Stripe checkout:

1. **Contact Form**: Leads fill out a contact form
2. **Sales Process**: Your sales team handles pricing and contracts
3. **Manual Setup**: You manually create the subscription in Stripe with custom pricing
4. **Account Setup**: Use admin tools to set the organization's plan to "enterprise"

---

## 📊 Monitoring & Analytics

### Stripe Dashboard

- Monitor subscription metrics
- Track failed payments
- View customer lifetime value
- Analyze churn rates

### Webhook Monitoring

- Set up alerts for webhook failures
- Monitor response times
- Track event processing success rates

### Application Metrics

- Track plan conversion rates
- Monitor usage by plan tier
- Measure feature adoption

---

## 🆘 Troubleshooting

### Common Issues

**Webhook not receiving events**:

- Check webhook URL is accessible
- Verify webhook secret is correct
- Check Stripe dashboard for delivery attempts

**Payment failures**:

- Check customer's payment method
- Verify billing address requirements
- Review Stripe logs for error details

**Subscription not updating**:

- Check webhook event processing
- Verify database updates are working
- Review application logs

### Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Test Your Integration](https://stripe.com/docs/testing)

---

## 📝 Next Steps

After completing this setup:

1. ✅ Test the complete billing flow
2. ✅ Set up monitoring and alerts
3. ✅ Configure usage limits per plan
4. ✅ Set up customer support processes
5. ✅ Plan your go-to-market strategy

For implementation details and customization options, see:

- `BILLING_CUSTOMIZATION.md` - How to modify plans and features
- `USAGE_LIMITS.md` - How to implement plan-based restrictions
