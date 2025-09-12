import type { ChatProviderMetadata, ChatUIMessagePart } from "@onlook/models";
import type { NewPart as DbNewPart, Part as DbPart } from "../../schema/chat/parts";

/**
 * Convert a database part to a UIMessage part
 */
export const fromDbPart = (part: DbPart): ChatUIMessagePart => {
    const { type, order, createdAt, providerMetadata } = part;

    switch (type) {
        case "text":
            return {
                type: "text",
                text: part.text_text || "",
                providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
            };

        case "reasoning":
            return {
                type: "reasoning",
                text: part.reasoning_text || "",
                providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
            };

        case "file":
            return {
                type: "file",
                mediaType: part.file_mediaType || "",
                filename: part.file_filename || undefined,
                url: part.file_url || "",
                providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
            };

        case "source-url":
            return {
                type: "source-url",
                sourceId: part.source_url_sourceId || "",
                url: part.source_url_url || "",
                title: part.source_url_title || undefined,
                providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
            };

        case "source-document":
            return {
                type: "source-document",
                sourceId: part.source_document_sourceId || "",
                mediaType: part.source_document_mediaType || "",
                title: part.source_document_title || "",
                filename: part.source_document_filename || undefined,
                providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
            };

        default:
            // Handle tool calls
            if (type.startsWith("tool-")) {
                const toolName = type.replace("tool-", "");
                const inputKey = `tool_${toolName}_input` as keyof DbPart;
                const outputKey = `tool_${toolName}_output` as keyof DbPart;

                return {
                    type: type as ChatUIMessagePart['type'],
                    toolCallId: part.tool_toolCallId || "",
                    toolName,
                    state: part.tool_state as 'input-streaming' | 'input-available' | 'output-available' | 'output-error',
                    input: part[inputKey] || undefined,
                    output: part[outputKey] || undefined,
                    errorText: part.tool_errorText || undefined,
                    providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
                } as ChatUIMessagePart;
            }

            // Handle data parts
            if (type.startsWith("data-")) {
                const dataType = type.replace("data-", "");
                if (dataType === "weather") {
                    return {
                        type: type as ChatUIMessagePart['type'],
                        id: part.data_weather_id || "",
                        data: {
                            location: part.data_weather_location || "",
                            weather: part.data_weather_weather || "",
                            temperature: part.data_weather_temperature || 0,
                        },
                        providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
                    } as ChatUIMessagePart;
                }
            }

            // Fallback for unknown types
            return {
                type: type as ChatUIMessagePart['type'],
                providerMetadata: part.providerMetadata as ChatProviderMetadata | undefined,
            } as ChatUIMessagePart;
    }
};

/**
 * Convert a UIMessage part to a database part
 */
export const toDbPart = (part: ChatUIMessagePart, messageId: string, order: number): DbNewPart => {
    const baseFields: Partial<DbNewPart> = {
        messageId,
        type: part.type,
        order,
        providerMetadata: 'providerMetadata' in part ? part.providerMetadata as Record<string, unknown> | undefined : undefined,
    };

    switch (part.type) {
        case "text":
            return {
                ...baseFields,
                text_text: part.text,
            } as DbNewPart;

        case "reasoning":
            return {
                ...baseFields,
                reasoning_text: part.text,
            } as DbNewPart;

        case "file":
            return {
                ...baseFields,
                file_mediaType: part.mediaType,
                file_filename: part.filename,
                file_url: part.url,
            } as DbNewPart;

        case "source-url":
            return {
                ...baseFields,
                source_url_sourceId: (part).sourceId,
                source_url_url: (part).url,
                source_url_title: (part).title,
            } as DbNewPart;

        case "source-document":
            return {
                ...baseFields,
                source_document_sourceId: (part).sourceId,
                source_document_mediaType: (part).mediaType,
                source_document_title: (part).title,
                source_document_filename: (part).filename,
            } as DbNewPart;

        default:
            // Handle tool calls
            if (part.type.startsWith("tool-") && 'toolCallId' in part && 'state' in part) {
                const toolName = part.type.replace("tool-", "");
                const inputKey = `tool_${toolName}_input` as keyof DbNewPart;
                const outputKey = `tool_${toolName}_output` as keyof DbNewPart;
                const toolPart = part as { toolCallId: string; state: string; errorText?: string; input?: unknown; output?: unknown };

                return {
                    ...baseFields,
                    tool_toolCallId: toolPart.toolCallId,
                    tool_state: toolPart.state,
                    tool_errorText: toolPart.errorText,
                    [inputKey]: toolPart.input,
                    [outputKey]: toolPart.output,
                } as DbNewPart;
            }

            // Handle data parts
            if (part.type.startsWith("data-")) {
                const dataType = part.type.replace("data-", "");
                if (dataType === "weather" && 'id' in part && 'weather' in part) {
                    const weatherPart = part as { id: string; weather: { location?: string; weather?: string; temperature?: number } };
                    return {
                        ...baseFields,
                        data_weather_id: weatherPart.id,
                        data_weather_location: weatherPart.weather?.location,
                        data_weather_weather: weatherPart.weather?.weather,
                        data_weather_temperature: weatherPart.weather?.temperature,
                    } as DbNewPart;
                }
            }

            // Fallback for unknown types
            return baseFields as DbNewPart;
    }
};

/**
 * Convert multiple database parts to UIMessage parts (sorted by order)
 */
export const fromDbParts = (parts: DbPart[]): ChatUIMessagePart[] => {
    return parts
        .sort((a, b) => a.order - b.order)
        .map(part => fromDbPart(part));
};

/**
 * Convert UIMessage parts to database parts 
 */
export const toDbParts = (parts: ChatUIMessagePart[], messageId: string): DbNewPart[] => {
    return parts.map((part, index) => toDbPart(part, messageId, index));
};