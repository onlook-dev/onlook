import type { UIMessage } from "ai";
import type { Part as DbPart, NewPart as DbNewPart } from "../../schema/chat/parts";

type UIMessagePart = UIMessage["parts"][0];

/**
 * Convert a database part to a UIMessage part
 */
export const fromDbPart = (part: DbPart): UIMessagePart => {
    const { type, order, createdAt, providerMetadata } = part;

    switch (type) {
        case "text":
            return {
                type: "text",
                text: part.text_text || "",
                providerMetadata,
            };

        case "reasoning":
            return {
                type: "reasoning", 
                text: part.reasoning_text || "",
                providerMetadata,
            };

        case "file":
            return {
                type: "file",
                mediaType: part.file_mediaType || "",
                filename: part.file_filename,
                url: part.file_url || "",
                providerMetadata,
            };

        case "source_url":
            return {
                type: "source_url",
                sourceId: part.source_url_sourceId || "",
                url: part.source_url_url || "",
                title: part.source_url_title,
                providerMetadata,
            };

        case "source_document":
            return {
                type: "source_document",
                sourceId: part.source_document_sourceId || "",
                mediaType: part.source_document_mediaType || "",
                title: part.source_document_title || "",
                filename: part.source_document_filename,
                providerMetadata,
            };

        default:
            // Handle tool calls
            if (type.startsWith("tool-")) {
                const toolName = type.replace("tool-", "");
                const inputKey = `tool_${toolName}_input` as keyof DbPart;
                const outputKey = `tool_${toolName}_output` as keyof DbPart;
                
                return {
                    type: type as any,
                    toolCallId: part.tool_toolCallId || "",
                    toolName,
                    state: part.tool_state as any,
                    input: part[inputKey] as any || undefined,
                    output: part[outputKey] as any || undefined,
                    errorText: part.tool_errorText || undefined,
                    providerMetadata,
                };
            }

            // Handle data parts
            if (type.startsWith("data-")) {
                const dataType = type.replace("data-", "");
                if (dataType === "weather") {
                    return {
                        type: type as any,
                        id: part.data_weather_id || "",
                        weather: {
                            location: part.data_weather_location || "",
                            weather: part.data_weather_weather || "",
                            temperature: part.data_weather_temperature || 0,
                        },
                        providerMetadata,
                    };
                }
            }

            // Fallback for unknown types
            return {
                type: type as any,
                providerMetadata,
            };
    }
};

/**
 * Convert a UIMessage part to a database part
 */
export const toDbPart = (part: UIMessagePart, messageId: string, order: number): DbNewPart => {
    const baseFields: Partial<DbNewPart> = {
        messageId,
        type: part.type,
        order,
        providerMetadata: part.providerMetadata,
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

        case "source_url":
            return {
                ...baseFields,
                source_url_sourceId: part.sourceId,
                source_url_url: part.url,
                source_url_title: part.title,
            } as DbNewPart;

        case "source_document":
            return {
                ...baseFields,
                source_document_sourceId: part.sourceId,
                source_document_mediaType: part.mediaType,
                source_document_title: part.title,
                source_document_filename: part.filename,
            } as DbNewPart;

        default:
            // Handle tool calls
            if (part.type.startsWith("tool-")) {
                const toolName = part.type.replace("tool-", "");
                const inputKey = `tool_${toolName}_input` as keyof DbNewPart;
                const outputKey = `tool_${toolName}_output` as keyof DbNewPart;
                
                return {
                    ...baseFields,
                    tool_toolCallId: (part as any).toolCallId,
                    tool_state: (part as any).state,
                    tool_errorText: (part as any).errorText,
                    [inputKey]: (part as any).input,
                    [outputKey]: (part as any).output,
                } as DbNewPart;
            }

            // Handle data parts
            if (part.type.startsWith("data-")) {
                const dataType = part.type.replace("data-", "");
                if (dataType === "weather" && (part as any).weather) {
                    return {
                        ...baseFields,
                        data_weather_id: (part as any).id,
                        data_weather_location: (part as any).weather.location,
                        data_weather_weather: (part as any).weather.weather,
                        data_weather_temperature: (part as any).weather.temperature,
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
export const fromDbParts = (parts: DbPart[]): UIMessagePart[] => {
    return parts
        .sort((a, b) => a.order - b.order)
        .map(part => fromDbPart(part));
};

/**
 * Convert UIMessage parts to database parts 
 */
export const toDbParts = (parts: UIMessagePart[], messageId: string): DbNewPart[] => {
    return parts.map((part, index) => toDbPart(part, messageId, index));
};