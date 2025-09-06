--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text,
	"message" text NOT NULL,
	"page_url" text,
	"user_agent" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_invitations" DROP CONSTRAINT "project_invitations_invitee_email_project_id_unique";--> statement-breakpoint
ALTER TABLE "custom_domain_verification" DROP CONSTRAINT "custom_domain_verification_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "preview_domains" DROP CONSTRAINT "preview_domains_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "deployments" DROP CONSTRAINT "deployments_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" varchar[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_preview_img_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD CONSTRAINT "custom_domain_verification_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_domains" ADD CONSTRAINT "preview_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "project_invitations_invitee_email_project_id_idx" ON "project_invitations" USING btree ("invitee_email","project_id");