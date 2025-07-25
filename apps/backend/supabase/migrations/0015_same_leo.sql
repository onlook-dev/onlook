--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE 'pending' BEFORE 'in_progress';--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "legacy_subscriptions" (
	"email" text PRIMARY KEY NOT NULL,
	"stripe_coupon_id" text NOT NULL,
	"stripe_promotion_code_id" text NOT NULL,
	"stripe_promotion_code" text NOT NULL,
	"redeem_at" timestamp with time zone,
	"redeem_by" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "legacy_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "build_script" text;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "build_flags" text;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "env_vars" jsonb;