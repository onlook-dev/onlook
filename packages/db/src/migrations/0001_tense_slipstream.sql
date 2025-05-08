CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_projects" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_projects_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "user_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "canvas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "frames" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "canvas_settings" RENAME TO "canvas";--> statement-breakpoint
ALTER TABLE "canvas" DROP CONSTRAINT "canvas_settings_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "frames" DROP CONSTRAINT "frames_canvas_id_canvas_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "frames" ALTER COLUMN "url" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_projects" ADD CONSTRAINT "user_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_projects" ADD CONSTRAINT "user_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "canvas" ADD CONSTRAINT "canvas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_canvas_id_canvas_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvas"("id") ON DELETE no action ON UPDATE no action;