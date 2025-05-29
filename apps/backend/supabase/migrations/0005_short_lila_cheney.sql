ALTER TABLE "project_invitations" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitee_email_project_id_unique" UNIQUE("invitee_email","project_id");--> statement-breakpoint
DROP TYPE "public"."invitation_status";