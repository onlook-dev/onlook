-- Create new type
CREATE TYPE "public"."verification_request_status" AS ENUM('active', 'expired', 'used');--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apex_domain" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_apex_domain_unique" UNIQUE("apex_domain")
);
--> statement-breakpoint
CREATE TABLE "preview_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_domain" text NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preview_domains_full_domain_unique" UNIQUE("full_domain")
);
--> statement-breakpoint
CREATE TABLE "published_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"full_domain" text NOT NULL,
	CONSTRAINT "published_domains_domain_id_unique" UNIQUE("domain_id"),
	CONSTRAINT "published_domains_full_domain_unique" UNIQUE("full_domain")
);
--> statement-breakpoint
CREATE TABLE "custom_domain_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"verification_id" text NOT NULL,
	"verification_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "verification_request_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preview_domains" ADD CONSTRAINT "preview_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_domains" ADD CONSTRAINT "published_domains_domain_id_custom_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."custom_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_domains" ADD CONSTRAINT "published_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD CONSTRAINT "custom_domain_verification_domain_id_custom_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."custom_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domain_verification" ADD CONSTRAINT "custom_domain_verification_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "preview_img";