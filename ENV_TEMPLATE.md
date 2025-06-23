# Environment Variables Template

Copy this to your `.env` file in the server directory (`apps/server/.env`):

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Authentication
BETTER_AUTH_SECRET="your-auth-secret-key-here"
BETTER_AUTH_URL="http://localhost:3001"

# CORS Configuration
CORS_ORIGIN="http://localhost:3000"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Stripe Plan Price IDs (get these from Stripe Dashboard)
STRIPE_BASIC_PRICE_ID="price_your_basic_plan_price_id"
STRIPE_PRO_PRICE_ID="price_your_pro_plan_price_id"

# Enterprise Contact (optional)
ENTERPRISE_CONTACT_EMAIL="sales@yourcompany.com"
ENTERPRISE_CONTACT_URL="https://yourcompany.com/contact-sales"

# Email Service (Resend)
RESEND_API_KEY="re_your_resend_api_key_here"
FROM_EMAIL="noreply@yourcompany.com"

# Optional: Set to development to log emails to console instead of sending
NODE_ENV="development"

# Optional: Analytics & Monitoring
# SENTRY_DSN="your_sentry_dsn_here"
# POSTHOG_API_KEY="your_posthog_key_here"
```

## Required Variables

### Database

- `DATABASE_URL`: PostgreSQL connection string

### Authentication

- `BETTER_AUTH_SECRET`: Random secret key for session encryption
- `BETTER_AUTH_URL`: Base URL of your server (http://localhost:3001 for development)

### CORS

- `CORS_ORIGIN`: Frontend URL (http://localhost:3000 for development)

### Stripe (Required for billing)

- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with sk*test* or sk*live*)
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (starts with pk*test* or pk*live*)
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (starts with whsec\_)
- `STRIPE_BASIC_PRICE_ID`: Price ID for Basic plan ($299/month)
- `STRIPE_PRO_PRICE_ID`: Price ID for Pro plan ($499/month)

### Enterprise (Optional)

- `ENTERPRISE_CONTACT_EMAIL`: Email for enterprise inquiries
- `ENTERPRISE_CONTACT_URL`: URL for enterprise contact page

### Email Service (Resend)

- `RESEND_API_KEY`: API key for Resend email service
- `FROM_EMAIL`: Email address for sending emails

## Setup Instructions

1. **Copy the template** to `apps/server/.env`
2. **Fill in your actual values** (see STRIPE_SETUP.md for Stripe setup)
3. **Generate secrets** for BETTER_AUTH_SECRET (use a random 32+ character string)
4. **Update URLs** for production deployment
5. **Set up Resend** for email service

## Security Notes

- ⚠️ Never commit `.env` files to version control
- ⚠️ Use different keys for development and production
- ⚠️ Rotate secrets regularly in production
- ⚠️ Use environment-specific values for each deployment

## Email Service Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add your domain and verify it (for production)
4. Set `RESEND_API_KEY` in your server environment
5. Set `FROM_EMAIL` to a verified email address

### Development Mode

In development, if you don't set `RESEND_API_KEY` or set `NODE_ENV=development`, emails will be logged to the console instead of being sent. This is perfect for testing the invite system without needing to set up email delivery.

## Production Considerations

- Use strong, unique secrets for all keys
- Use production Stripe keys
- Verify your email domain with Resend
- Set `NODE_ENV=production` for the server
- Use HTTPS URLs for all services
