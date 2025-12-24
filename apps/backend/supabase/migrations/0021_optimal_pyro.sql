ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_parent_id_comments_id_fk";
ALTER TABLE "comments"
    ADD CONSTRAINT "comments_parent_id_comments_id_fk"
    FOREIGN KEY ("parent_id")
    REFERENCES "public"."comments"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;
