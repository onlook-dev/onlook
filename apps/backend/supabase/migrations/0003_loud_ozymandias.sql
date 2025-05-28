CREATE TABLE "user_canvases" (
	"user_id" uuid NOT NULL,
	"canvas_id" uuid NOT NULL,
	"scale" numeric NOT NULL,
	"x" numeric NOT NULL,
	"y" numeric NOT NULL,
	CONSTRAINT "user_canvases_user_id_canvas_id_pk" PRIMARY KEY("user_id","canvas_id")
);
--> statement-breakpoint
ALTER TABLE "user_canvases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_canvases" ADD CONSTRAINT "user_canvases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_canvases" ADD CONSTRAINT "user_canvases_canvas_id_canvas_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint

-- Copy over the scale, x, and y values from the canvas table to the user_canvases table
INSERT INTO "user_canvases" ("user_id", "canvas_id", "scale", "x", "y")
SELECT 
    up.user_id,
    c.id as canvas_id,
    c.scale,
    c.x,
    c.y
FROM "canvas" c
INNER JOIN "user_projects" up ON c.project_id = up.project_id
ON CONFLICT (user_id, canvas_id) DO NOTHING;

ALTER TABLE "canvas" DROP COLUMN "scale";--> statement-breakpoint
ALTER TABLE "canvas" DROP COLUMN "x";--> statement-breakpoint
ALTER TABLE "canvas" DROP COLUMN "y";