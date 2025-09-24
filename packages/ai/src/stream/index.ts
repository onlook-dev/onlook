import { type ChatMessage } from '@onlook/models';
import { convertToModelMessages, type ModelMessage, type ToolUIPart } from 'ai';
import { getHydratedUserMessage, type HydrateMessageOptions } from '../prompt';

export function convertToStreamMessages(messages: ChatMessage[]): ModelMessage[] {
    const totalMessages = messages.length;
    const lastUserMessageIndex = messages.findLastIndex((message) => message.role === 'user');
    const lastAssistantMessageIndex = messages.findLastIndex(
        (message) => message.role === 'assistant',
    );

    const streamMessages = messages.map((message, index) => {
        const opt: HydrateMessageOptions = {
            totalMessages,
            currentMessageIndex: index,
            lastUserMessageIndex,
            lastAssistantMessageIndex,
        };
        return toStreamMessage(message, opt);
    });

    return convertToModelMessages(streamMessages);
}

export const toStreamMessage = (message: ChatMessage, opt: HydrateMessageOptions): ChatMessage => {
    if (message.role === 'assistant') {
        return {
            ...message,
            parts: ensureToolCallResults(message.parts),
        };
    } else if (message.role === 'user') {
        const hydratedMessage = getHydratedUserMessage(
            message.id,
            message.parts,
            message.metadata?.context ?? [],
            opt,
        );
        return hydratedMessage;
    }
    return message;
};

export const extractTextFromParts = (parts: ChatMessage['parts']): string => {
    return parts
        ?.map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        })
        .join('');
};

export const ensureToolCallResults = (parts: ChatMessage['parts']): ChatMessage['parts'] => {
    if (!parts) return parts;

    const toolResultIds = new Set<string>();

    // First pass: identify which tool calls already have results
    parts.forEach((part) => {
        if (part.type?.startsWith('tool-')) {
            const toolPart = part as ToolUIPart;
            if (toolPart.toolCallId && toolPart.state === 'output-available') {
                toolResultIds.add(toolPart.toolCallId);
            }
        }
    });

    // Second pass: update parts that need stub results
    return parts.map((part) => {
        if (part.type?.startsWith('tool-')) {
            const toolPart = part as ToolUIPart;
            if (
                toolPart.toolCallId &&
                (toolPart.state === 'input-available' || toolPart.state === 'input-streaming') &&
                !toolResultIds.has(toolPart.toolCallId)
            ) {
                // Update existing part to have stub result
                return {
                    ...toolPart,
                    state: 'output-available',
                    output: 'No tool result returned',
                };
            }
        }
        return part;
    });
};
