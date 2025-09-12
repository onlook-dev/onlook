import type { ChatMessage } from '@onlook/models';
import { type ChatProviderMetadata } from "@onlook/models";
import { generateId, type ToolUIPart } from "ai";
import { sql } from "drizzle-orm";
import {
    check,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    varchar
} from "drizzle-orm/pg-core";
import { messages } from "./message";

export const parts = pgTable(
    "parts",
    {
        id: varchar()
            .primaryKey()
            .$defaultFn(() => generateId()),
        messageId: varchar()
            .references(() => messages.id, { onDelete: "cascade" })
            .notNull(),
        type: varchar().$type<ChatMessage["parts"][0]["type"]>().notNull(),
        createdAt: timestamp().defaultNow().notNull(),
        order: integer().notNull().default(0),

        // Text fields
        text_text: text(),

        // Reasoning fields
        reasoning_text: text(),

        // File fields
        file_mediaType: varchar(),
        file_filename: varchar(), // optional
        file_url: varchar(),

        // Source url fields
        source_url_sourceId: varchar(),
        source_url_url: varchar(),
        source_url_title: varchar(), // optional

        // Source document fields
        source_document_sourceId: varchar(),
        source_document_mediaType: varchar(),
        source_document_title: varchar(),
        source_document_filename: varchar(), // optional

        // shared tool call columns
        tool_toolCallId: varchar(),
        tool_state: varchar().$type<ToolUIPart["state"]>(),
        tool_errorText: varchar().$type<ToolUIPart["state"]>(),

        // TODO: Tools
        // tools inputs and outputss are stored in separate cols
        // tool_getWeatherInformation_input:
        //     jsonb().$type<getWeatherInformationInput>(),
        // tool_getWeatherInformation_output:
        //     jsonb().$type<getWeatherInformationOutput>(),

        // tool_getLocation_input: jsonb().$type<getLocationInput>(),
        // tool_getLocation_output: jsonb().$type<getLocationOutput>(),

        // // TODO: Data parts
        // data_weather_id: varchar().$defaultFn(() => generateId()),
        // data_weather_location: varchar().$type<MyDataPart["weather"]["location"]>(),
        // data_weather_weather: varchar().$type<MyDataPart["weather"]["weather"]>(),
        // data_weather_temperature:
        //     real().$type<MyDataPart["weather"]["temperature"]>(),

        providerMetadata: jsonb().$type<ChatProviderMetadata>(),
    },
    (t) => [
        // Indexes for performance optimisation
        index("parts_message_id_idx").on(t.messageId),
        index("parts_message_id_order_idx").on(t.messageId, t.order),

        // Check constraints
        check(
            "text_text_required_if_type_is_text",
            // This SQL expression enforces: if type = 'text' then text_text IS NOT NULL
            sql`CASE WHEN ${t.type} = 'text' THEN ${t.text_text} IS NOT NULL ELSE TRUE END`,
        ),
        check(
            "reasoning_text_required_if_type_is_reasoning",
            sql`CASE WHEN ${t.type} = 'reasoning' THEN ${t.reasoning_text} IS NOT NULL ELSE TRUE END`,
        ),
        check(
            "file_fields_required_if_type_is_file",
            sql`CASE WHEN ${t.type} = 'file' THEN ${t.file_mediaType} IS NOT NULL AND ${t.file_url} IS NOT NULL ELSE TRUE END`,
        ),
        check(
            "source_url_fields_required_if_type_is_source_url",
            sql`CASE WHEN ${t.type} = 'source_url' THEN ${t.source_url_sourceId} IS NOT NULL AND ${t.source_url_url} IS NOT NULL ELSE TRUE END`,
        ),
        check(
            "source_document_fields_required_if_type_is_source_document",
            sql`CASE WHEN ${t.type} = 'source_document' THEN ${t.source_document_sourceId} IS NOT NULL AND ${t.source_document_mediaType} IS NOT NULL AND ${t.source_document_title} IS NOT NULL ELSE TRUE END`,
        ),
    ],
);

export type MessagePart = typeof parts.$inferInsert;
export type NewMessagePart = typeof parts.$inferSelect;