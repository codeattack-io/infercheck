CREATE TABLE "models" (
	"id" text NOT NULL,
	"provider_slug" text NOT NULL,
	"display_name" text NOT NULL,
	"modality" text DEFAULT 'text' NOT NULL,
	"context_window" integer,
	"input_price_per_m_tokens" numeric(12, 6),
	"output_price_per_m_tokens" numeric(12, 6),
	"tokens_per_second" numeric(8, 2),
	"sync_source" text DEFAULT 'openrouter' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "models_id_provider_slug_pk" PRIMARY KEY("id","provider_slug")
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"provider_slug" text,
	"models_upserted" integer,
	"models_deactivated" integer,
	"error" text
);
