ALTER TABLE "conversations" ADD COLUMN "parent_conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "parent_message_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_installation_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_parent_conversation_id_conversations_id_fk" FOREIGN KEY ("parent_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_parent_message_id_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "conversations_parent_conversation_idx" ON "conversations" USING btree ("parent_conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_parent_message_idx" ON "conversations" USING btree ("parent_message_id");--> statement-breakpoint
CREATE INDEX "conversations_project_id_idx" ON "conversations" USING btree ("project_id");