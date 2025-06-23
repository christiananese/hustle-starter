# ✅ Multi-Tenant SaaS Starter – Full Implementation Checklist

## 📁 Project Structure

- [x] ✅ Initialize monorepo with Turborepo
- [x] ✅ Install and configure Bun, Hono, Drizzle, TRPC, Tailwind, shadcn/ui
- [x] Create `/apps/web` (Vite + React + TanStack Router)
- [x] Create `/apps/server` (Hono + Drizzle + TRPC)
- [x] Create `/apps/native` (React Native + Expo)
- [ ] Create `/packages/ui` for shared UI components
- [ ] Create `/packages/db` for Drizzle schema and DB utils

---

## 🏢 Multitenancy Core (Organizations)

### ✅ Database Schema

- [x] ✅ Create `organization` table with billing fields
- [x] ✅ Create `organization_user` table with `role`
- [x] ✅ Create `webhook_event` table for idempotency
- [x] ✅ Add seed script to create a user + org on signup
- [x] ✅ Apply RLS-like org scoping in backend manually
- [x] ✅ Remove unused `organization_subscription` table

### 🧠 Backend Logic

- [x] ✅ Create `getCurrentOrg()` middleware for Hono
- [x] ✅ Inject `orgId` from `x-organization-id` header
- [x] ✅ Ensure user is a member of the org
- [x] ✅ Create `/me/organizations` route to list user's orgs
- [x] ✅ Add ability to switch org in client context

---

## 🧑‍💻 Auth & Role-based Access

- [x] ✅ Use `better-auth` to manage sessions
- [x] ✅ Store current org in session or header
- [x] ✅ Check membership in TRPC middleware
- [x] ✅ Implement `requireRole('admin')` guard
- [x] ✅ Add frontend context to hold `currentOrg` and `role`
- [x] ✅ Implement role-based UI restrictions

---

## 🧪 Org Management (CRUD)

- [x] ✅ Create org on signup (auto)
- [x] ✅ Allow creating new orgs from dashboard
- [x] ✅ Allow switching orgs (dropdown)
- [x] ✅ Allow updating org name, slug, logo
- [x] ✅ Full user management with role changes
- [x] ✅ Remove users from organization (admin+)

---

## 📨 Organization Invites (Resend + Signup)

- [x] ✅ Add `organization_invite` table (email, orgId, role, token, expiresAt)
- [x] ✅ Backend API to create invite link and send email via Resend
- [x] ✅ Accept invite link (token) → connects user to org with role
- [x] ✅ Show pending invites in dashboard
- [x] ✅ Email service with Resend integration and local development fallback
- [x] ✅ Beautiful HTML email templates for invites and welcome messages
- [x] ✅ Complete invite management UI (send, resend, revoke)
- [x] ✅ Role-based access control for invite management

---

## 🔑 API Keys (Per Organization)

### ✅ Schema

- [x] ✅ Create `api_keys` table (id, orgId, label, hashedKey, createdBy, createdAt, expiresAt, revoked)

### ✅ Backend

- [x] ✅ Route to generate + store hashed key
- [x] ✅ Route to revoke key
- [x] ✅ Role-based access control (admin+ required)
- [ ] 🔄 Middleware to extract API key from `Authorization: Bearer ...`
- [ ] 🔄 Validate API key and attach `orgId` context
- [ ] 🔄 Add optional `requireApiKey()` guard for external-facing routes

---

## 💳 Stripe Subscriptions (Org-level)

### ✅ Database & Schema

- [x] ✅ Add billing fields to `organization` table
- [x] ✅ Add plan configuration with limits
- [x] ✅ Environment variable handling for Stripe

### ✅ Backend Implementation

- [x] ✅ Stripe service with checkout, portal, subscription management
- [x] ✅ TRPC routes for billing operations
- [x] ✅ Webhook handler with idempotency
- [x] ✅ Handle Stripe webhook events:
  - [x] ✅ `checkout.session.completed`
  - [x] ✅ `customer.subscription.updated`
  - [x] ✅ `customer.subscription.deleted`
  - [x] ✅ `invoice.payment_succeeded`
  - [x] ✅ `invoice.payment_failed`
- [x] ✅ Update org metadata with plan tier

### ✅ Frontend Implementation

- [x] ✅ Complete billing page with plan selection
- [x] ✅ Stripe Checkout integration
- [x] ✅ Customer portal access
- [x] ✅ Subscription status display
- [x] ✅ Role-based billing access (admin+ only)

### 📋 Plan Limits (Examples Provided)

- [x] ✅ Plan configuration with limits (API keys, members, projects)
- [x] ✅ Comprehensive examples for limit enforcement
- [x] ✅ Frontend components for limit display
- [ ] 🔄 Implement actual limit enforcement (app-specific)

---

## 🧩 TRPC API Structure

- [x] ✅ Create TRPC context with `userId`, `orgId`, `role`
- [x] ✅ Add `orgProcedure`, `adminProcedure`, `ownerProcedure`
- [x] ✅ Create routers:
  - [x] ✅ `auth` – login, logout
  - [x] ✅ `org` – create, update, switch, delete
  - [x] ✅ `orgUser` – list users, change role, remove users
  - [x] ✅ `invite` – invite + accept
  - [x] ✅ `apiKeys` – create, revoke, list
  - [x] ✅ `billing` – checkout, portal, subscription management

---

## 🧑‍🎨 Frontend Implementation

### 🧠 Context & Layout

- [x] ✅ Create `OrgContext` to store `orgId`, `role`, `setOrgId`
- [x] ✅ Add `AuthProvider` using `better-auth`
- [x] ✅ Wrap layout with `OrgProvider` and `AuthProvider`
- [x] ✅ Proper TRPC organization context handling

### 📦 Pages

- [x] ✅ `/auth` – login/signup pages
- [x] ✅ `/dashboard` – org dashboard
- [x] ✅ `/organization/settings` – org settings
- [x] ✅ `/organization/settings/members` – manage users with roles
- [x] ✅ `/organization/settings/api-keys` – full API key management
- [x] ✅ `/organization/settings/billing` – complete Stripe billing
- [x] ✅ `/organization/settings/invites` – pending invites

### 🧩 Components

- [x] ✅ `OrgSwitcher`
- [x] ✅ `RoleBadge` with color coding
- [x] ✅ `PlanSelector` with beautiful plan cards
- [x] ✅ `ApiKeyList` with role-based actions
- [x] ✅ Complete UI component library (alerts, badges, cards, etc.)
- [x] ✅ `InviteUserForm`
- [ ] 🔄 `SubscriptionUsageDisplay`

---

## 📚 Documentation & Setup

- [x] ✅ `STRIPE_SETUP.md` – Complete Stripe configuration guide
- [x] ✅ `BILLING_CUSTOMIZATION.md` – Billing system customization
- [x] ✅ `BILLING_ISSUES.md` – Security and reliability considerations
- [x] ✅ `ENV_TEMPLATE.md` – Environment variables template with email service
- [ ] 🔄 API documentation with examples
- [ ] 🔄 Deployment guides

---

## 🧪 Tests & Deployment

- [x] ✅ Add dev + prod `.env` templates
- [x] ✅ Working seed script with test user/org/key
- [ ] 🔄 Unit tests for critical business logic
- [ ] 🔄 Integration tests for billing flows
- [ ] 🔄 Deploy frontend to Vercel / Netlify
- [ ] 🔄 Deploy backend to Fly.io / Railway / Cloudflare
- [ ] 🔄 Enable API key usage in staging env

---

## 🚀 Next Priority Items

### 🔥 High Priority (Core Functionality)

1. ~~**Organization Invites System**~~ ✅ **COMPLETED**
   - ~~Email integration with Resend~~ ✅
   - ~~Invite acceptance flow~~ ✅
   - ~~Pending invites management~~ ✅

2. **API Key Authentication Middleware**
   - Extract API keys from Authorization header
   - Validate and attach org context
   - Rate limiting per API key

3. **Plan Limits Enforcement**
   - Implement actual limit checking
   - Graceful limit exceeded handling
   - Usage tracking and display

### 🛡️ Medium Priority (Production Readiness)

4. **Enhanced Security**
   - Webhook IP allowlisting
   - Rate limiting on sensitive endpoints
   - Input validation and sanitization

5. **Monitoring & Observability**
   - Error tracking and alerting
   - Billing event monitoring
   - Usage analytics

6. **Testing & Quality**
   - Unit tests for business logic
   - Integration tests for billing
   - E2E tests for critical flows

### 🎨 Low Priority (Polish & UX)

7. **UI/UX Improvements**
   - Better loading states
   - Error boundaries
   - Responsive design polish

8. **Advanced Features**
   - Audit logs
   - Advanced analytics
   - Custom integrations

---

## ✅ CURRENT STATUS: 🎯 ~80% Complete

**✅ Completed**: Core multitenancy, role-based access, API keys, complete billing system with Stripe
**🔄 In Progress**: Organization invites, API authentication middleware
**📋 Next**: Plan limits enforcement, enhanced security, production deployment
