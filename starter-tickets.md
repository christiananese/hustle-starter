# ✅ Multi-Tenant SaaS Starter – Full Implementation Checklist

## 📁 Project Structure

- [x] ✅ Initialize monorepo with Turborepo
- [x] ✅ Install and configure Bun, Hono, Drizzle, TRPC, Tailwind, shadcn/ui
- [x] Create `/apps/web` (Vite + React + TanStack Router)
- [x] Create `/apps/server` (Hono + Drizzle + TRPC)
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

- [x] Create `getCurrentOrg()` middleware for Hono
- [x] Inject `orgId` from `x-organization-id` header
- [x] Ensure user is a member of the org
- [x] Create `/me/organizations` route to list user's orgs
- [x] Add ability to switch org in client context

---

## 🧑‍💻 Auth & Role-based Access

- [x] Use `better-auth` to manage sessions
- [x] Store current org in session or header
- [x] Check membership in TRPC middleware
- [ ] Implement `requireRole('admin')` guard
- [x] Add frontend context to hold `currentOrg` and `role`

---

## 🧪 Org Management (CRUD)

- [x] Create org on signup (auto)
- [x] Allow creating new orgs from dashboard
- [x] Allow switching orgs (dropdown)
- [x] Allow updating org name, slug, logo

---

## 📨 Organization Invites (Resend + Signup)

- [x] Add `organization_invite` table (email, orgId, role, token, expiresAt)
- [ ] Backend API to create invite link and send email via Resend
- [ ] Accept invite link (token) → connects user to org with role
- [x] Show pending invites in dashboard

---

## 🔑 API Keys (Per Organization)

### ✅ Schema

- [x] Create `api_keys` table (id, orgId, label, hashedKey, createdBy, createdAt, expiresAt, revoked)

### ✅ Backend

- [ ] Route to generate + store hashed key
- [ ] Route to revoke key
- [ ] Middleware to extract API key from `Authorization: Bearer ...`
- [ ] Validate API key and attach `orgId` context
- [ ] Add optional `requireApiKey()` guard for external-facing routes

---

## 💳 Stripe Subscriptions (Org-level)

- [x] Add `stripe_customer_id` and `stripe_subscription_id` to `organization`
- [ ] Create Stripe checkout session tied to org
- [ ] Handle Stripe webhook events:
  - [ ] `checkout.session.completed`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.deleted`
- [ ] Update org metadata with plan tier
- [x] Add frontend billing page (change plan, view status)

---

## 🧩 TRPC API Structure

- [x] Create TRPC context with `userId`, `orgId`, `role`
- [x] Add `orgOnly` and `adminOnly` procedures
- [ ] Create routers:
  - [x] `auth` – login, logout
  - [x] `org` – create, update, switch
  - [ ] `orgUser` – list users, change role
  - [ ] `invite` – invite + accept
  - [ ] `apiKeys` – create, revoke, list
  - [ ] `billing` – create checkout session, get status

---

## 🧑‍🎨 Frontend Implementation

### 🧠 Context & Layout

- [x] Create `OrgContext` to store `orgId`, `role`, `setOrgId`
- [x] Add `AuthProvider` using `better-auth`
- [x] Wrap layout with `OrgProvider` and `AuthProvider`

### 📦 Pages

- [x] `/auth` – login/signup pages
- [x] `/dashboard` – org dashboard
- [x] `/organization` – org settings
- [x] `/organization/users` – manage users
- [x] `/organization/invites` – pending invites
- [x] `/organization/billing` – Stripe billing
- [x] `/api-keys` – list, revoke, create keys

### 🧩 Components

- [x] `OrgSwitcher`
- [x] `RoleBadge`
- [x] `InviteUserForm`
- [x] `ApiKeyList`
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
