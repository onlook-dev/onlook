CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"max" integer NOT NULL,
	"left" integer DEFAULT 0 NOT NULL,
	"carry_over_key" uuid NOT NULL,
	"carry_over_total" integer DEFAULT 0 NOT NULL,
	"stripe_subscription_item_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "applied" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "applied" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "snapshots" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "snapshots" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "suggestions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "checkpoints" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_current_period_start" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_current_period_end" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_limits_user_time_idx" ON "rate_limits" USING btree ("user_id","started_at","ended_at");--> statement-breakpoint
CREATE INDEX "usage_records_user_time_idx" ON "usage_records" USING btree ("user_id","timestamp");--> statement-breakpoint