-- Create ENUMs only if they don't exist
DO $$ BEGIN
    CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
    CREATE TYPE "public"."project_role" AS ENUM('owner', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS "project_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_email" varchar NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"token" varchar NOT NULL,
	"role" "project_role" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "project_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

ALTER TABLE "user_projects" ADD COLUMN IF NOT EXISTS "role" "project_role";--> statement-breakpoint
-- Set all existing records to 'owner' role (assuming existing users should be owners)
UPDATE "user_projects" SET "role" = 'owner' WHERE "role" IS NULL;
-- Make the role column NOT NULL after setting default values
ALTER TABLE "user_projects" ALTER COLUMN "role" SET NOT NULL;

ALTER TABLE "project_invitations" DROP CONSTRAINT IF EXISTS "project_invitations_project_id_projects_id_fk";
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_invitations" DROP CONSTRAINT IF EXISTS "project_invitations_inviter_id_users_id_fk";
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;