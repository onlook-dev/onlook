ALTER TYPE "public"."message_role" ADD VALUE 'system';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_installation_id" text;