CREATE TYPE "public"."frame_type" AS ENUM('web');--> statement-breakpoint
CREATE TABLE "canvas_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scale" numeric,
	"position" jsonb
);
--> statement-breakpoint
CREATE TABLE "frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canvas_id" uuid NOT NULL,
	"type" "frame_type" NOT NULL,
	"x" numeric NOT NULL,
	"y" numeric NOT NULL,
	"width" numeric NOT NULL,
	"height" numeric NOT NULL,
	"url" varchar(2048)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"preview_url" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"preview_img" varchar(2048),
	"sandbox_id" varchar(64),
	"sandbox_url" varchar(2048)
);
--> statement-breakpoint
ALTER TABLE "canvas_settings" ADD CONSTRAINT "canvas_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_canvas_id_canvas_settings_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvas_settings"("id") ON DELETE no action ON UPDATE no action;