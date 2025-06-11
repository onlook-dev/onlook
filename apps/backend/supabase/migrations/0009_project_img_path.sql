ALTER TABLE "projects" DROP COLUMN IF EXISTS "preview_img_url";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "preview_img_path";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "preview_img_bucket";--> statement-breakpoint

ALTER TABLE "projects" ADD COLUMN "preview_img_url" varchar;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_img_path" varchar;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_img_bucket" varchar;--> statement-breakpoint