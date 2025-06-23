# ✅ Multi-Tenant SaaS Starter – Full Implementation Checklist

## 📁 Project Structure

- [ ] ✅ Initialize monorepo with Turborepo
- [ ] ✅ Install and configure Bun, Hono, Drizzle, TRPC, Tailwind, shadcn/ui
- [ ] Create `/apps/web` (Vite + React + TanStack Router)
- [ ] Create `/apps/server` (Hono + Drizzle + TRPC)
- [ ] Create `/packages/ui` for shared UI components
- [ ] Create `/packages/db` for Drizzle schema and DB utils

---

## 🏢 Multitenancy Core (Organizations)

### ✅ Database Schema

- [x] Create `organization` table
- [x] Create `organization_user` table with `role`
- [x] Add seed script to create a user + org on signup
- [x] Apply RLS-like org scoping in backend manually

### 🧠 Backend Logic

- [ ] Create `getCurrentOrg()` middleware for Hono
- [ ] Inject `orgId` from `x-organization-id` header
- [ ] Ensure user is a member of the org
- [ ] Create `/me/organizations` route to list user's orgs
- [ ] Add ability to switch org in client context

---

## 🧑‍💻 Auth & Role-based Access

- [ ] Use `better-auth` to manage sessions
- [ ] Store current org in session or header
- [ ] Check membership in TRPC middleware
- [ ] Implement `requireRole('admin')` guard
- [ ] Add frontend context to hold `currentOrg` and `role`

---

## 🧪 Org Management (CRUD)

- [ ] Create org on signup (auto)
- [ ] Allow creating new orgs from dashboard
- [ ] Allow switching orgs (dropdown)
- [ ] Allow updating org name, slug, logo

---

## 📨 Organization Invites (Resend + Signup)

- [ ] Add `organization_invite` table (email, orgId, role, token, expiresAt)
- [ ] Backend API to create invite link and send email via Resend
- [ ] Accept invite link (token) → connects user to org with role
- [ ] Show pending invites in dashboard

---

## 🔑 API Keys (Per Organization)

### ✅ Schema

- [ ] Create `api_keys` table (id, orgId, label, hashedKey, createdBy, createdAt, expiresAt, revoked)

### ✅ Backend

- [ ] Route to generate + store hashed key
- [ ] Route to revoke key
- [ ] Middleware to extract API key from `Authorization: Bearer ...`
- [ ] Validate API key and attach `orgId` context
- [ ] Add optional `requireApiKey()` guard for external-facing routes

---

## 💳 Stripe Subscriptions (Org-level)

- [ ] Add `stripe_customer_id` and `stripe_subscription_id` to `organization`
- [ ] Create Stripe checkout session tied to org
- [ ] Handle Stripe webhook events:
  - [ ] `checkout.session.completed`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.deleted`
- [ ] Update org metadata with plan tier
- [ ] Add frontend billing page (change plan, view status)

---

## 🧩 TRPC API Structure

- [ ] Create TRPC context with `userId`, `orgId`, `role`
- [ ] Add `orgOnly` and `adminOnly` procedures
- [ ] Create routers:
  - [ ] `auth` – login, logout
  - [ ] `org` – create, update, switch
  - [ ] `orgUser` – list users, change role
  - [ ] `invite` – invite + accept
  - [ ] `apiKeys` – create, revoke, list
  - [ ] `billing` – create checkout session, get status

---

## 🧑‍🎨 Frontend Implementation

### 🧠 Context & Layout

- [ ] Create `OrgContext` to store `orgId`, `role`, `setOrgId`
- [ ] Add `AuthProvider` using `better-auth`
- [ ] Wrap layout with `OrgProvider` and `AuthProvider`

### 📦 Pages

- [ ] `/auth` – login/signup pages
- [ ] `/dashboard` – org dashboard
- [ ] `/organization` – org settings
- [ ] `/organization/users` – manage users
- [ ] `/organization/invites` – pending invites
- [ ] `/organization/billing` – Stripe billing
- [ ] `/api-keys` – list, revoke, create keys

### 🧩 Components

- [ ] `OrgSwitcher`
- [ ] `RoleBadge`
- [ ] `InviteUserForm`
- [ ] `ApiKeyList`
- [ ] `SubscriptionStatusBadge`

---

## 🧪 Tests & Deployment

- [ ] Add dev + prod `.env` for secrets
- [ ] Add end-to-end seed script with test user/org/key
- [ ] Deploy frontend to Vercel / Netlify
- [ ] Deploy backend to Fly.io / Railway / Cloudflare
- [ ] Enable API key usage in staging env

---

## ✅ DONE = Fully-featured Multitenant Starter
