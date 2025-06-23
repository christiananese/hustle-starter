# API Key Authentication System

This directory contains the API key authentication middleware for external API access.

## Files

- `api-key-auth.ts` - Main middleware for API key authentication and rate limiting

## Usage

### Basic Authentication

```typescript
import { requireApiKey, getApiKeyContext } from "../lib/api-key-auth";

app.get("/api/v1/data", requireApiKey(), async (c) => {
  const { organizationId } = getApiKeyContext(c);
  // Your handler logic here
});
```

### With Rate Limiting

```typescript
app.get(
  "/api/v1/expensive",
  requireApiKey({
    rateLimit: { requests: 10, window: "5m" }, // 10 requests per 5 minutes
  }),
  async (c) => {
    // Handler logic
  }
);
```

## Rate Limit Windows

- `"60s"` - 60 seconds
- `"15m"` - 15 minutes
- `"1h"` - 1 hour
- `"1d"` - 1 day

## Security Features

1. **SHA-256 Hashing** - API keys are hashed before storage
2. **Expiration Checking** - Keys can have expiration dates
3. **Revocation Support** - Keys can be revoked instantly
4. **Organization Scoping** - Each key is tied to one organization
5. **Rate Limiting** - Per-key rate limits with configurable windows

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Your data here
  }
}
```

### Error Responses

```json
{
  "error": "Unauthorized",
  "message": "API key required. Use 'Authorization: Bearer <api_key>' header."
}
```

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Maximum 100 requests per 1h."
}
```

## Example Endpoints

See `/routes/api/v1/organizations.ts` for example implementations:

- `GET /api/v1/organizations/current` - Get organization details (100 req/hour)
- `GET /api/v1/organizations/members` - Get members list (50 req/hour)
- `GET /api/v1/organizations/stats` - Get statistics (10 req/5min)
