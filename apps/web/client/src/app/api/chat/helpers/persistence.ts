import { db } from '@onlook/db';
import { messages, parts } from '@onlook/db/schema';
import type { UIMessage } from 'ai';
import { eq } from 'drizzle-orm';

/**
 * Save a UIMessage with its parts to the database using the new parts table structure
 */
export async function saveMessageWithParts(message: UIMessage, conversationId: string) {
    return await db.transaction(async (trx) => {
        // Prepare message data
        const messageData = {
            id: message.id,
            conversationId,
            role: message.role,
            content: message.parts
                .filter(part => part.type === 'text')
                .map(part => (part as any).text)
                .join(''),
            createdAt: new Date(),
            context: [],
            checkpoints: [],
            applied: null,
            commitOid: null,
            snapshots: null,
            // Keep legacy parts for backward compatibility during transition
            parts: message.parts,
        };

        // Insert/update message
        const [dbMessage] = await trx
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
        if (message.parts && message.parts.length > 0) {
            // Delete existing parts for this message
            await trx.delete(parts).where(eq(parts.messageId, message.id));

            // Convert and insert new parts
            const dbParts = message.parts.map((part, index) => ({
                messageId: message.id,
                type: part.type,
                order: index,
                createdAt: new Date(),
                ...convertUIPartToDbFields(part)
            }));

            if (dbParts.length > 0) {
                await trx.insert(parts).values(dbParts);
            }
        }

        return dbMessage;
    });
}

/**
 * Convert UIMessage part to database part fields using prefix-based columns
 */
function convertUIPartToDbFields(part: UIMessage['parts'][0]): Record<string, any> {
    const fields: Record<string, any> = {
        providerMetadata: part.providerMetadata
    };

    switch (part.type) {
        case "text":
            fields.text_text = (part as any).text;
            break;

        case "reasoning":
            fields.reasoning_text = (part as any).text;
            break;

        case "file":
            fields.file_mediaType = (part as any).mediaType;
            fields.file_filename = (part as any).filename;
            fields.file_url = (part as any).url;
            break;

        case "source_url":
            fields.source_url_sourceId = (part as any).sourceId;
            fields.source_url_url = (part as any).url;
            fields.source_url_title = (part as any).title;
            break;

        case "source_document":
            fields.source_document_sourceId = (part as any).sourceId;
            fields.source_document_mediaType = (part as any).mediaType;
            fields.source_document_title = (part as any).title;
            fields.source_document_filename = (part as any).filename;
            break;

        default:
            // Handle tool calls
            if (part.type.startsWith("tool-")) {
                const toolName = part.type.replace("tool-", "");
                const toolPart = part as any;
                
                fields.tool_toolCallId = toolPart.toolCallId;
                fields.tool_state = toolPart.state;
                fields.tool_errorText = toolPart.errorText;
                
                // Map specific tool input/output columns
                const inputKey = `tool_${toolName}_input`;
                const outputKey = `tool_${toolName}_output`;
                fields[inputKey] = toolPart.input;
                fields[outputKey] = toolPart.output;
            }
            // Handle data parts
            else if (part.type.startsWith("data-")) {
                const dataType = part.type.replace("data-", "");
                if (dataType === "weather") {
                    const dataPart = part as any;
                    fields.data_weather_id = dataPart.id;
                    fields.data_weather_location = dataPart.weather?.location;
                    fields.data_weather_weather = dataPart.weather?.weather;
                    fields.data_weather_temperature = dataPart.weather?.temperature;
                }
            }
            break;
    }

    return fields;
}