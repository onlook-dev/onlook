ALTER TABLE "canvas" ALTER COLUMN "scale" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "frames" ALTER COLUMN "url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "preview_url" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "preview_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "preview_img" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "sandbox_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "sandbox_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "sandbox_url" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "sandbox_url" SET NOT NULL;