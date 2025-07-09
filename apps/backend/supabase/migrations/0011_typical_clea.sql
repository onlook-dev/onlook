;--> statement-breakpoint
CREATE TYPE "public"."price_keys" AS ENUM('PRO_MONTHLY_TIER_1', 'PRO_MONTHLY_TIER_2', 'PRO_MONTHLY_TIER_3', 'PRO_MONTHLY_TIER_4', 'PRO_MONTHLY_TIER_5', 'PRO_MONTHLY_TIER_6', 'PRO_MONTHLY_TIER_7', 'PRO_MONTHLY_TIER_8', 'PRO_MONTHLY_TIER_9', 'PRO_MONTHLY_TIER_10', 'PRO_MONTHLY_TIER_11');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."scheduled_subscription_action" AS ENUM('price_change', 'cancellation');--> statement-breakpoint
CREATE TYPE "public"."usage_types" AS ENUM('message', 'deployment');--> statement-breakpoint
CREATE TABLE "project_settings" (
	"project_id" uuid NOT NULL,
	"run_command" text DEFAULT '' NOT NULL,
	"build_command" text DEFAULT '' NOT NULL,
	"install_command" text DEFAULT '' NOT NULL,
	CONSTRAINT "project_settings_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "project_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"price_key" "price_keys" NOT NULL,
	"monthly_message_limit" integer NOT NULL,
	"stripe_price_id" text NOT NULL,
	CONSTRAINT "prices_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
ALTER TABLE "prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "product_type" NOT NULL,
	"stripe_product_id" text NOT NULL,
	CONSTRAINT "products_stripe_product_id_unique" UNIQUE("stripe_product_id")
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"price_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"status" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_subscription_item_id" text NOT NULL,
	"scheduled_action" "scheduled_subscription_action",
	"scheduled_price_id" uuid,
	"scheduled_change_at" timestamp with time zone,
	"stripe_subscription_schedule_id" text,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "subscriptions_stripe_subscription_item_id_unique" UNIQUE("stripe_subscription_item_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "usage_types" DEFAULT 'message' NOT NULL,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "preview_domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "published_domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ALTER COLUMN "status" SET DATA TYPE "public"."verification_request_status";--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "commit_oid" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "should_warn_delete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_id_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_scheduled_price_id_prices_id_fk" FOREIGN KEY ("scheduled_price_id") REFERENCES "public"."prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."status";