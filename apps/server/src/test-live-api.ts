/**
 * Live API Key Testing Script
 * Tests the actual API endpoints with real API keys
 */

import { eq } from "drizzle-orm";
import { db } from "./db";
import { apiKey } from "./db/schema/organization";

async function testLiveApi() {
  console.log("🧪 Testing Live API Key Endpoints\n");

  try {
    // Get an active API key from the database
    const [testKey] = await db
      .select({
        id: apiKey.id,
        organizationId: apiKey.organizationId,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
      })
      .from(apiKey)
      .where(eq(apiKey.isActive, "true"))
      .limit(1);

    if (!testKey) {
      console.log("❌ No active API keys found. Please create one first:");
      console.log("   1. Start the web app: bun run dev:web");
      console.log("   2. Log in and go to Settings > API Keys");
      console.log("   3. Create a new API key");
      console.log("   4. Run this test again");
      return;
    }

    console.log(`✅ Found API key: ${testKey.name} (${testKey.keyPrefix}...)`);
    console.log(`   Organization: ${testKey.organizationId}\n`);

    const baseUrl = "http://localhost:3001";

    // Note: We can't actually make the request here because we need the real API key
    // (not just the prefix), but we can show the curl commands to test manually

    console.log("🔧 Manual Testing Commands:");
    console.log(
      "   (Replace YOUR_ACTUAL_API_KEY with the full key from the web UI)\n"
    );

    console.log("1️⃣ Test Organization Details:");
    console.log(`   curl -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" \\`);
    console.log(`        "${baseUrl}/api/v1/organizations/current"`);
    console.log("   Expected: 200 OK with organization data\n");

    console.log("2️⃣ Test Organization Members:");
    console.log(`   curl -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" \\`);
    console.log(`        "${baseUrl}/api/v1/organizations/members"`);
    console.log("   Expected: 200 OK with members list\n");

    console.log("3️⃣ Test Organization Stats (Rate Limited):");
    console.log(`   curl -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" \\`);
    console.log(`        "${baseUrl}/api/v1/organizations/stats"`);
    console.log("   Expected: 200 OK with stats data\n");

    console.log("4️⃣ Test Invalid API Key:");
    console.log(`   curl -H "Authorization: Bearer invalid_key_123" \\`);
    console.log(`        "${baseUrl}/api/v1/organizations/current"`);
    console.log("   Expected: 401 Unauthorized\n");

    console.log("5️⃣ Test Missing API Key:");
    console.log(`   curl "${baseUrl}/api/v1/organizations/current"`);
    console.log("   Expected: 401 Unauthorized\n");

    console.log("6️⃣ Test Rate Limiting (Run this 11 times quickly):");
    console.log(`   for i in {1..11}; do`);
    console.log(`     curl -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" \\`);
    console.log(`          "${baseUrl}/api/v1/organizations/stats"`);
    console.log(`     echo "Request $i"`);
    console.log(`   done`);
    console.log(
      "   Expected: First 10 succeed, 11th returns 429 Too Many Requests\n"
    );

    console.log("🔍 What to Look For:");
    console.log("   ✅ Proper JSON responses");
    console.log("   ✅ Correct HTTP status codes");
    console.log("   ✅ Rate limiting headers");
    console.log("   ✅ Organization-scoped data");
    console.log("   ✅ Security error messages");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

if (import.meta.main) {
  testLiveApi().catch(console.error);
}
