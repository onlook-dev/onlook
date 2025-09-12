import { messages, parts } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import type { ChatUIMessage, ChatUIMessagePart, chatMetadataSchema } from '@onlook/models';
import type { UIMessage } from 'ai';
import { eq } from 'drizzle-orm';

/**
 * Convert a generic AI SDK UIMessage to our ChatUIMessage structure
 */
function convertToTypedUIMessage(message: UIMessage): ChatUIMessage {
    // Type-safe conversion of generic UIMessage to our specific ChatUIMessage
    const convertedParts: ChatUIMessagePart[] = message.parts.map(part => {
        // The parts are compatible, we just need to assert the correct type
        return part as ChatUIMessagePart;
    });

    return {
        id: message.id,
        role: message.role as 'user' | 'assistant',
        parts: convertedParts,
        metadata: message.metadata as ReturnType<typeof chatMetadataSchema.parse>,
    };
}

/**
 * Save a UIMessage with its parts to the database using the new parts table structure
 */
export async function saveMessageWithParts(message: UIMessage | ChatUIMessage, conversationId: string) {
    const typedMessage = 'metadata' in message && message.metadata !== undefined 
        ? message as ChatUIMessage 
        : convertToTypedUIMessage(message as UIMessage);
    return await db.transaction(async (tx) => {
        // Prepare message data
        const messageData = {
            id: typedMessage.id,
            conversationId,
            role: typedMessage.role,
            content: typedMessage.parts
                .filter(part => part.type === 'text')
                .map(part => (part as { text: string }).text)
                .join(''),
            createdAt: new Date(),
            context: [],
            checkpoints: [],
            applied: null,
            commitOid: null,
            snapshots: null,
            // Keep legacy parts for backward compatibility during transition
            parts: typedMessage.parts
        };

        // Insert/update message
        const [dbMessage] = await tx
            .insert(messages)
            .values(messageData)
            .onConflictDoUpdate({
                target: [messages.id],
                set: {
                    ...messageData,
                },
            })
            .returning();

        // Handle parts
        if (typedMessage.parts && typedMessage.parts.length > 0) {
            // Delete existing parts for this message
            await tx.delete(parts).where(eq(parts.messageId, typedMessage.id));

            // Convert and insert new parts
            const dbParts = typedMessage.parts.map((part, index) => ({
                messageId: typedMessage.id,
                type: part.type,
                order: index,
                createdAt: new Date(),
                ...convertUIPartToDbFields(part)
            }));

            if (dbParts.length > 0) {
                await tx.insert(parts).values(dbParts);
            }
        }

        return dbMessage;
    });
}

/**
 * Convert UIMessage part to database part fields using prefix-based columns
 */
function convertUIPartToDbFields(part: ChatUIMessage['parts'][0]): Record<string, unknown> {
    const fields: Record<string, unknown> = {
        providerMetadata: 'providerMetadata' in part ? part.providerMetadata as Record<string, unknown> | undefined : undefined
    };

    switch (part.type) {
        case "text":
            fields.text_text = (part).text;
            break;

        case "reasoning":
            fields.reasoning_text = (part).text;
            break;

        case "file":
            fields.file_mediaType = (part).mediaType;
            fields.file_filename = (part).filename;
            fields.file_url = (part).url;
            break;

        case "source-url":
            fields.source_url_sourceId = (part).sourceId;
            fields.source_url_url = (part).url;
            fields.source_url_title = (part).title;
            break;

        case "source-document":
            fields.source_document_sourceId = (part).sourceId;
            fields.source_document_mediaType = (part).mediaType;
            fields.source_document_title = (part).title;
            fields.source_document_filename = (part).filename;
            break;

        default:
            // Handle tool calls
            if (part.type.startsWith("tool-")) {
                const toolName = part.type.replace("tool-", "");
                
                // Type guard to ensure this is a tool part with the expected properties
                if ('toolCallId' in part && 'state' in part) {
                    const toolPart = part as { toolCallId: string; state: string; errorText?: string; input?: unknown; output?: unknown };

                    fields.tool_toolCallId = toolPart.toolCallId;
                    fields.tool_state = toolPart.state;
                    fields.tool_errorText = toolPart.errorText;

                    // Map specific tool input/output columns
                    const inputKey = `tool_${toolName}_input`;
                    const outputKey = `tool_${toolName}_output`;
                    fields[inputKey] = toolPart.input;
                    fields[outputKey] = toolPart.output;
                }
            }
            // Handle data parts
            else if (part.type.startsWith("data-")) {
                const dataType = part.type.replace("data-", "");
                if (dataType === "weather" && 'id' in part && 'data' in part) {
                    const dataPart = part as { id: string; data: { location?: string; weather?: string; temperature?: number } };
                    fields.data_weather_id = dataPart.id;
                    fields.data_weather_location = dataPart.data?.location;
                    fields.data_weather_weather = dataPart.data?.weather;
                    fields.data_weather_temperature = dataPart.data?.temperature;
                }
            }
            break;
    }

    return fields;
}