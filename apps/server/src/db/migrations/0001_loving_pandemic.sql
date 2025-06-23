CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed" text DEFAULT 'true' NOT NULL,
	"processed_at" timestamp NOT NULL,
	"event_data" jsonb,
	"error" text,
	"retry_count" text DEFAULT '0' NOT NULL,
	CONSTRAINT "webhook_event_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
DROP TABLE "organization_subscription" CASCADE;