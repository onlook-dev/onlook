ALTER TABLE "project_invitations" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
ALTER TABLE "project_invitations" DROP CONSTRAINT IF EXISTS "project_invitations_invitee_email_project_id_unique";
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitee_email_project_id_unique" UNIQUE("invitee_email","project_id");--> statement-breakpoint
DROP TYPE IF EXISTS "public"."invitation_status";