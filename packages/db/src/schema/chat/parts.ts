import type { UIMessage as AiMessage, ToolUIPart } from "ai";
import { relations, sql } from "drizzle-orm";
import { 
    check, 
    index, 
    integer, 
    jsonb, 
    pgTable, 
    text, 
    timestamp, 
    uuid, 
    varchar 
} from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { messages } from "./message";

export const parts = pgTable("parts", {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
        .notNull()
        .references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: varchar("type").$type<AiMessage["parts"][0]["type"]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    order: integer("order").notNull().default(0),

    // Text fields
    text_text: text(),

    // Reasoning fields  
    reasoning_text: text(),

    // File fields
    file_mediaType: varchar(),
    file_filename: varchar(),
    file_url: varchar(),

    // Source URL fields
    source_url_sourceId: varchar(),
    source_url_url: varchar(), 
    source_url_title: varchar(),

    // Source document fields
    source_document_sourceId: varchar(),
    source_document_mediaType: varchar(),
    source_document_title: varchar(),
    source_document_filename: varchar(),

    // Shared tool call columns
    tool_toolCallId: varchar(),
    tool_state: varchar().$type<ToolUIPart["state"]>(),
    tool_errorText: text(),

    // Tool-specific input/output columns for your tools
    tool_listFiles_input: jsonb(),
    tool_listFiles_output: jsonb(),

    tool_readFile_input: jsonb(),
    tool_readFile_output: jsonb(),

    tool_bashRead_input: jsonb(),
    tool_bashRead_output: jsonb(),

    tool_onlookInstructions_input: jsonb(),
    tool_onlookInstructions_output: jsonb(),

    tool_readStyleGuide_input: jsonb(),
    tool_readStyleGuide_output: jsonb(),

    tool_listBranches_input: jsonb(),
    tool_listBranches_output: jsonb(),

    tool_scrapeUrl_input: jsonb(),
    tool_scrapeUrl_output: jsonb(),

    tool_webSearch_input: jsonb(),
    tool_webSearch_output: jsonb(),

    tool_glob_input: jsonb(),
    tool_glob_output: jsonb(),

    tool_grep_input: jsonb(),
    tool_grep_output: jsonb(),

    tool_searchReplaceEditFile_input: jsonb(),
    tool_searchReplaceEditFile_output: jsonb(),

    tool_searchReplaceMultiEditFile_input: jsonb(),
    tool_searchReplaceMultiEditFile_output: jsonb(),

    tool_fuzzyEditFile_input: jsonb(),
    tool_fuzzyEditFile_output: jsonb(),

    tool_writeFile_input: jsonb(),
    tool_writeFile_output: jsonb(),

    tool_bashEdit_input: jsonb(),
    tool_bashEdit_output: jsonb(),

    tool_sandbox_input: jsonb(),
    tool_sandbox_output: jsonb(),

    tool_terminalCommand_input: jsonb(),
    tool_terminalCommand_output: jsonb(),

    tool_typecheck_input: jsonb(),
    tool_typecheck_output: jsonb(),

    // Provider metadata
    providerMetadata: jsonb(),
}, (table) => ({
    // Indexes for performance optimization
    messageIdIdx: index("parts_message_id_idx").on(table.messageId),
    messageIdOrderIdx: index("parts_message_id_order_idx").on(table.messageId, table.order),
    typeIdx: index("parts_type_idx").on(table.type),

    // Check constraints for data integrity
    textRequired: check(
        "text_text_required_if_type_is_text",
        sql`CASE WHEN ${table.type} = 'text' THEN ${table.text_text} IS NOT NULL ELSE TRUE END`
    ),
    
    reasoningRequired: check(
        "reasoning_text_required_if_type_is_reasoning", 
        sql`CASE WHEN ${table.type} = 'reasoning' THEN ${table.reasoning_text} IS NOT NULL ELSE TRUE END`
    ),

    fileFieldsRequired: check(
        "file_fields_required_if_type_is_file",
        sql`CASE WHEN ${table.type} = 'file' THEN ${table.file_mediaType} IS NOT NULL AND ${table.file_url} IS NOT NULL ELSE TRUE END`
    ),

    sourceUrlFieldsRequired: check(
        "source_url_fields_required_if_type_is_source_url",
        sql`CASE WHEN ${table.type} = 'source_url' THEN ${table.source_url_sourceId} IS NOT NULL AND ${table.source_url_url} IS NOT NULL ELSE TRUE END`
    ),

    sourceDocumentFieldsRequired: check(
        "source_document_fields_required_if_type_is_source_document", 
        sql`CASE WHEN ${table.type} = 'source_document' THEN ${table.source_document_sourceId} IS NOT NULL AND ${table.source_document_mediaType} IS NOT NULL AND ${table.source_document_title} IS NOT NULL ELSE TRUE END`
    ),

    // Tool call constraints - ensure tool calls have required fields
    toolCallFieldsRequired: check(
        "tool_call_fields_required",
        sql`CASE WHEN ${table.type} LIKE 'tool-%' THEN ${table.tool_toolCallId} IS NOT NULL AND ${table.tool_state} IS NOT NULL ELSE TRUE END`
    ),
})).enableRLS();

export const partsInsertSchema = createInsertSchema(parts);
export const partsUpdateSchema = createUpdateSchema(parts);

export const partsRelations = relations(parts, ({ one }) => ({
    message: one(messages, {
        fields: [parts.messageId],
        references: [messages.id],
        relationName: "message_parts",
    }),
}));

export type Part = typeof parts.$inferSelect;
export type NewPart = typeof parts.$inferInsert;