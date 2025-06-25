Each task below should be handled one at a time. After testing, say:
next ticket
to move on.

✅ Ticket 1: Create /$orgSlug/get-started Route
Goal: Create a protected onboarding route scoped to the current organization.

Tasks:

Add new route in TanStack Router: /$orgSlug/get-started

Apply protectedRoute and load orgContext

Redirect unauthenticated users or missing org context

Add breadcrumb: Dashboard / Get Started

✅ Ticket 2: Build Onboarding Layout
Goal: Create the onboarding page layout with grid/card structure.

Tasks:

Use shadcn/ui Card, Grid, Progress, Button components

Layout sections:

Profile Setup

Create First Project

Add First Tasks

Learn Section (optional)

Use Tailwind for spacing: grid-cols-3, gap-4, rounded-xl

✅ Ticket 3: Add Profile Completion Card
Goal: Display profile completion percentage with a checklist and CTA.

Tasks:

Show progress circle based on completed fields

Checklist:

✅ Add Full Name

✅ Upload Profile Picture

✅ Tell us more about your orgnaiization

Complete Profile button → /settings/profile

✅ Ticket 4: Upgrade Callout (Optional)
Goal: Add CTA to upgrade to Pro.

Tasks:

Card in sidebar or lower left

Button: Upgrade Now → /settings/billing

Only visible when user is not on the pro plan yet

✅ Ticket 5: Completion Logic
Goal: Make onboarding feel interactive and rewarding.

Tasks:

Animate checkmarks when a step is completed

Use Framer Motion, or Tailwind transition

Optionally: add toast or feedback on step completion

🧠 Rules Reminder for Cursor:
Use protectedRoute for all org-scoped pages.

Every API call must validate x-organization-id.

Reuse shadcn/ui components.

Don't overfetch — use current context wherever possible.

Use TanStack Router loaders/actions where needed.
