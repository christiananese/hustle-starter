# Email Service

This directory contains the refactored email service that uses React-based templates for sending emails.

## Architecture

### `/templates/`

Contains React components for different email templates:

- `invite.tsx` - Organization invitation emails
- `welcome.tsx` - Welcome emails after invite acceptance

### `/index.ts`

Main EmailService class with:

- `send()` - Generic method for sending emails with templates
- `sendInvite()` - Send organization invite emails
- `sendWelcome()` - Send welcome emails

## Features

- **React-based templates**: Uses React components for email HTML generation
- **Development mode**: Logs email details to console instead of sending
- **Production mode**: Sends emails via Resend API
- **Template rendering**: Uses `@react-email/render` for HTML generation
- **Type safety**: Full TypeScript support with proper interfaces

## Usage

```typescript
import { EmailService } from "../emails";

// Send an invite
await EmailService.sendInvite({
  inviterName: "John Doe",
  inviterEmail: "john@company.com",
  organizationName: "Acme Corp",
  inviteUrl: "https://app.com/accept-invite?token=abc123",
  recipientEmail: "user@example.com",
  role: "admin",
});

// Send a welcome email
await EmailService.sendWelcome({
  userName: "Jane Smith",
  userEmail: "jane@example.com",
  organizationName: "Acme Corp",
  role: "admin",
  dashboardUrl: "https://app.com/dashboard",
});
```

## Environment Variables

- `RESEND_API_KEY` - Resend API key (optional in development)
- `FROM_EMAIL` - From email address (defaults to noreply@yourapp.com)
- `NODE_ENV` - Set to 'development' to enable console logging mode
- `CORS_ORIGIN` - Base URL for generating links in emails

## Development Mode

When `RESEND_API_KEY` is not set or `NODE_ENV=development`, emails are logged to console with:

- Recipient email
- Subject line
- Template name
- Important links (invite/dashboard URLs)

This allows local development without requiring Resend configuration.
