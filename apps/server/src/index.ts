import { trpcServer } from "@hono/trpc-server";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-organization-id"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Stripe webhook endpoint (before JSON parsing middleware)
app.post("/api/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "No signature provided" }, 400);
  }

  try {
    const body = await c.req.text();
    const { StripeService } = await import("./lib/stripe");
    const { handleStripeWebhook } = await import("./lib/webhook-handler");

    // Construct webhook event
    const event = StripeService.constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle the event
    await handleStripeWebhook(event);

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Webhook handler failed" }, 400);
  }
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  })
);

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
