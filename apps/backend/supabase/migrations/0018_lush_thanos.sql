CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"git_branch" varchar,
	"git_commit_sha" varchar,
	"git_repo_url" varchar,
	"sandbox_id" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "frames" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "frames" ALTER COLUMN "type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "sandbox_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "sandbox_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "frames" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "trace_id" varchar(255);--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "branches_project_id_idx" ON "branches" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_name_per_project_ux" ON "branches" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_default_per_project_ux" ON "branches" USING btree ("project_id") WHERE "branches"."is_default" = true;--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_trace_idx" UNIQUE("user_id","trace_id");--> statement-breakpoint
DROP TYPE "public"."frame_type";