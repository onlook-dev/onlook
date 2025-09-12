import {
    conversations,
    fromDbMessageWithParts,
    messageInsertSchema,
    messages,
    messageUpdateSchema,
    parts,
    type Message
} from '@onlook/db';
import { MessageCheckpointType, type ChatMessageRole } from '@onlook/models';
import { asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const messageRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const result = await ctx.db.query.messages.findMany({
                where: eq(messages.conversationId, input.conversationId),
                orderBy: [asc(messages.createdAt)],
                with: {
                    parts: {
                        orderBy: [asc(parts.order)]
                    }
                }
            });
            return result.map((message) =>
                fromDbMessageWithParts(message, message.parts || [])
            );
        }),
    upsert: protectedProcedure
        .input(z.object({
            message: messageInsertSchema.extend({
                parts: z.array(z.any()).optional()
            })
        }))
        .mutation(async ({ ctx, input }) => {
            const conversationId = input.message.conversationId;
            if (conversationId) {
                const conversation = await ctx.db.query.conversations.findFirst({
                    where: eq(conversations.id, conversationId),
                });
                if (!conversation) {
                    throw new Error(`Conversation not found`);
                }
            }

            const { parts: messageParts, ...messageData } = input.message;
            const normalizedMessage = normalizeMessage(messageData);

            // Start transaction to ensure consistency
            return await ctx.db.transaction(async (tx) => {
                // Insert/update message
                const [dbMessage] = await tx
                    .insert(messages)
                    .values(normalizedMessage)
                    .onConflictDoUpdate({
                        target: [messages.id],
                        set: {
                            ...normalizedMessage,
                        },
                    })
                    .returning();

                if (!dbMessage) {
                    throw new Error('Message not created');
                }

                // Handle parts if provided
                if (messageParts && messageParts.length > 0) {
                    // Delete existing parts
                    await tx.delete(parts).where(eq(parts.messageId, dbMessage.id));

                    // Convert and insert new parts
                    const dbParts = messageParts.map((part, index) => ({
                        messageId: dbMessage.id,
                        type: part.type,
                        order: index,
                        ...getPartFields(part)
                    }));

                    await tx.insert(parts).values(dbParts);
                }

                return dbMessage;
            });
        }),
    upsertMany: protectedProcedure
        .input(z.object({
            messages: messageInsertSchema.array(),
        }))
        .mutation(async ({ ctx, input }) => {
            const normalizedMessages = input.messages.map(normalizeMessage);
            await ctx.db.insert(messages).values(normalizedMessages);
        }),
    update: protectedProcedure
        .input(z.object({
            messageId: z.string(),
            message: messageUpdateSchema
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.update(messages).set({
                ...input.message,
                role: input.message.role as ChatMessageRole,
                parts: input.message.parts as Message['parts'],
            }).where(eq(messages.id, input.messageId));
        }),
    updateCheckpoints: protectedProcedure
        .input(z.object({
            messageId: z.string(),
            checkpoints: z.array(z.object({
                type: z.nativeEnum(MessageCheckpointType),
                oid: z.string(),
                createdAt: z.date(),
            })),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.update(messages).set({
                checkpoints: input.checkpoints,
            }).where(eq(messages.id, input.messageId));
        }),
    delete: protectedProcedure
        .input(z.object({
            messageIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(messages).where(inArray(messages.id, input.messageIds));
        }),
})

const normalizeMessage = (message: z.infer<typeof messageInsertSchema>) => {
    return {
        ...message,
        role: message.role as ChatMessageRole,
        createdAt: typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt,
    };
};

/**
 * Helper function to convert UI message part to database part fields
 */
const getPartFields = (part: any) => {
    const fields: any = {
        providerMetadata: part.providerMetadata
    };

    switch (part.type) {
        case "text":
            fields.text_text = part.text;
            break;
        case "reasoning":
            fields.reasoning_text = part.text;
            break;
        case "file":
            fields.file_mediaType = part.mediaType;
            fields.file_filename = part.filename;
            fields.file_url = part.url;
            break;
        case "source_url":
            fields.source_url_sourceId = part.sourceId;
            fields.source_url_url = part.url;
            fields.source_url_title = part.title;
            break;
        case "source_document":
            fields.source_document_sourceId = part.sourceId;
            fields.source_document_mediaType = part.mediaType;
            fields.source_document_title = part.title;
            fields.source_document_filename = part.filename;
            break;
        default:
            // Handle tool calls
            if (part.type.startsWith("tool-")) {
                const toolName = part.type.replace("tool-", "");
                fields.tool_toolCallId = part.toolCallId;
                fields.tool_state = part.state;
                fields.tool_errorText = part.errorText;
                fields[`tool_${toolName}_input`] = part.input;
                fields[`tool_${toolName}_output`] = part.output;
            }
            // Handle data parts
            else if (part.type.startsWith("data-")) {
                const dataType = part.type.replace("data-", "");
                if (dataType === "weather") {
                    fields.data_weather_id = part.id;
                    fields.data_weather_location = part.weather?.location;
                    fields.data_weather_weather = part.weather?.weather;
                    fields.data_weather_temperature = part.weather?.temperature;
                }
            }
            break;
    }

    return fields;
};