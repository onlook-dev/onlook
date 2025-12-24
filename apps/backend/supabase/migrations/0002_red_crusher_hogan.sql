CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"auto_apply_code" boolean DEFAULT true NOT NULL,
	"expand_code_blocks" boolean DEFAULT true NOT NULL,
	"show_suggestions" boolean DEFAULT true NOT NULL,
	"show_mini_chat" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;