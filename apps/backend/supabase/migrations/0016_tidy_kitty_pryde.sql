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
ALTER TABLE "conversations" ADD COLUMN "suggestions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_current_period_start" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_current_period_end" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.update_user_subscription_status()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    user_has_active_subscription boolean;
    target_user_id uuid;
BEGIN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);

    SELECT EXISTS(
        SELECT 1 FROM subscriptions 
        WHERE user_id = target_user_id 
        AND status = 'active'
    ) INTO user_has_active_subscription;

    UPDATE users 
    SET subscription_active = user_has_active_subscription,
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS update_user_subscription_status_trigger ON public.subscriptions;--> statement-breakpoint
CREATE TRIGGER update_user_subscription_status_trigger
AFTER INSERT OR UPDATE OR DELETE
ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_user_subscription_status();--> statement-breakpoint

UPDATE users 
SET subscription_active = EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE subscriptions.user_id = users.id 
    AND subscriptions.status = 'active'
);--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_limits_user_time_idx" ON "rate_limits" USING btree ("user_id","started_at","ended_at");--> statement-breakpoint
CREATE INDEX "usage_records_user_time_idx" ON "usage_records" USING btree ("user_id","timestamp");
