CREATE TYPE "public"."project_custom_domain_status" AS ENUM('active', 'cancelled');--> statement-breakpoint
ALTER TABLE "auth"."users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "published_domains" RENAME COLUMN "id" TO "custom_domain_id";--> statement-breakpoint
ALTER TABLE "custom_domain_verification" RENAME COLUMN "domain_id" TO "custom_domain_id";--> statement-breakpoint
ALTER TABLE "custom_domain_verification" RENAME COLUMN "verification_id" TO "freestyle_verification_id";--> statement-breakpoint
ALTER TABLE "published_domains" DROP CONSTRAINT "published_domains_domain_id_unique";--> statement-breakpoint
ALTER TABLE "published_domains" DROP CONSTRAINT "published_domains_full_domain_unique";--> statement-breakpoint
ALTER TABLE "published_domains" DROP CONSTRAINT "published_domains_domain_id_custom_domains_id_fk";
--> statement-breakpoint
ALTER TABLE "published_domains" DROP CONSTRAINT "published_domains_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "custom_domain_verification" DROP CONSTRAINT "custom_domain_verification_domain_id_custom_domains_id_fk";
--> statement-breakpoint
DROP TYPE "public"."verification_request_status";--> statement-breakpoint
CREATE TYPE "public"."verification_request_status" AS ENUM('pending', 'verified', 'cancelled');--> statement-breakpoint
ALTER TABLE "published_domains" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "published_domains" ADD CONSTRAINT "published_domains_custom_domain_id_project_id_pk" PRIMARY KEY("custom_domain_id","project_id");--> statement-breakpoint
ALTER TABLE "published_domains" ADD COLUMN "status" "project_custom_domain_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD COLUMN "full_domain" text NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD COLUMN "txt_record" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD COLUMN "a_records" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "published_domains" ADD CONSTRAINT "published_domains_custom_domain_id_custom_domains_id_fk" FOREIGN KEY ("custom_domain_id") REFERENCES "public"."custom_domains"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "published_domains" ADD CONSTRAINT "published_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD CONSTRAINT "custom_domain_verification_custom_domain_id_custom_domains_id_fk" FOREIGN KEY ("custom_domain_id") REFERENCES "public"."custom_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_domains" DROP COLUMN "domain_id";--> statement-breakpoint
ALTER TABLE "custom_domain_verification" DROP COLUMN "verification_code";