ALTER TABLE "projects" ADD COLUMN "preview_img_url" varchar;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_img_path" varchar;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_img_bucket" varchar;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "preview_img";