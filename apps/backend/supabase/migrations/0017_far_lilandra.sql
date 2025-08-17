CREATE SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "custom_domain_verification" DROP CONSTRAINT "custom_domain_verification_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "preview_domains" DROP CONSTRAINT "preview_domains_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "deployments" DROP CONSTRAINT "deployments_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_preview_img_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD CONSTRAINT "custom_domain_verification_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_domains" ADD CONSTRAINT "preview_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;