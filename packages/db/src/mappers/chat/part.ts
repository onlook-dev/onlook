import type { MessagePart } from "@/schema/chat/part";
import { type ChatMessagePart } from "@onlook/models";
import { assertNever } from "@onlook/utility";

export const toDbParts = (
    messageParts: ChatMessagePart[],
    messageId: string,
): MessagePart[] => {
    return messageParts.map((part, index) => {
        switch (part.type) {
            case "text":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    text_text: part.text,
                };
            case "reasoning":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    reasoning_text: part.text,
                    providerMetadata: part.providerMetadata,
                };
            case "file":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    file_mediaType: part.mediaType,
                    file_filename: part.filename,
                    file_url: part.url,
                };
            case "source-document":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    source_document_sourceId: part.sourceId,
                    source_document_mediaType: part.mediaType,
                    source_document_title: part.title,
                    source_document_filename: part.filename,
                    providerMetadata: part.providerMetadata,
                };
            case "source-url":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    source_url_sourceId: part.sourceId,
                    source_url_url: part.url,
                    source_url_title: part.title,
                    providerMetadata: part.providerMetadata,
                };
            case "step-start":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                };
            case "tool-getWeatherInformation":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    tool_toolCallId: part.toolCallId,
                    tool_state: part.state,
                    tool_getWeatherInformation_input:
                        part.state === "input-available" ||
                            part.state === "output-available" ||
                            part.state === "output-error"
                            ? part.input
                            : undefined,
                    tool_getWeatherInformation_output:
                        part.state === "output-available" ? part.output : undefined,
                    tool_getWeatherInformation_errorText:
                        part.state === "output-error" ? part.errorText : undefined,
                };
            case "tool-getLocation":
                return {
                    messageId,
                    order: index,
                    type: part.type,
                    tool_toolCallId: part.toolCallId,
                    tool_state: part.state,
                    tool_getLocation_input:
                        part.state === "input-available" ||
                            part.state === "output-available" ||
                            part.state === "output-error"
                            ? part.input
                            : undefined,
                    tool_getLocation_output:
                        part.state === "output-available" ? part.output : undefined,
                    tool_getLocation_errorText:
                        part.state === "output-error" ? part.errorText : undefined,
                };
            default:
                assertNever(part.type);
        }
    });
};

export const fromDbPart = (
    part: MessagePart,
): ChatMessagePart => {
    switch (part.type) {
        case "text":
            return {
                type: part.type,
                text: part.text_text!,
            };
        case "reasoning":
            return {
                type: part.type,
                text: part.reasoning_text!,
                providerMetadata: part.providerMetadata ?? undefined,
            };
        case "file":
            return {
                type: part.type,
                mediaType: part.file_mediaType!,
                filename: part.file_filename!,
                url: part.file_url!,
            };
        case "source-document":
            return {
                type: part.type,
                sourceId: part.source_document_sourceId!,
                mediaType: part.source_document_mediaType!,
                title: part.source_document_title!,
                filename: part.source_document_filename!,
                providerMetadata: part.providerMetadata ?? undefined,
            };
        case "source-url":
            return {
                type: part.type,
                sourceId: part.source_url_sourceId!,
                url: part.source_url_url!,
                title: part.source_url_title!,
                providerMetadata: part.providerMetadata ?? undefined,
            };
        case "step-start":
            return {
                type: part.type,
            };
        default:
            assertNever(part.type);
    }
};