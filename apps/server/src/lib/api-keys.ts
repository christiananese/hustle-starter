import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

// Generate a secure API key with prefix
export function generateApiKey(prefix: string = "sk_live"): {
  key: string;
  keyHash: string;
  keyPrefix: string;
} {
  // Generate a random key part (32 characters)
  const keyPart = nanoid(32);

  // Combine prefix with key part
  const fullKey = `${prefix}_${keyPart}`;

  // Hash the full key for storage
  const keyHash = bcrypt.hashSync(fullKey, 10);

  return {
    key: fullKey,
    keyHash,
    keyPrefix: prefix,
  };
}

// Verify an API key against its hash
export function verifyApiKey(key: string, hash: string): boolean {
  return bcrypt.compareSync(key, hash);
}

// Extract organization ID from API key context
// This would be used in middleware to authenticate API requests
export function extractKeyPrefix(key: string): string | null {
  const parts = key.split("_");
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1]}`;
  }
  return null;
}

// Mask API key for display (show only prefix and last 4 characters)
export function maskApiKey(key: string): string {
  if (key.length <= 8) return key;

  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  const middle = "*".repeat(Math.max(0, key.length - 12));

  return `${prefix}${middle}${suffix}`;
}
