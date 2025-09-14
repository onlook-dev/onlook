import { type ChatMessage } from '@onlook/models';
import { convertToModelMessages, type ModelMessage, type UIMessage as VercelMessage } from 'ai';
import { getHydratedUserMessage, type HydrateMessageOptions } from '../prompt';

export function convertToStreamMessages(messages: ChatMessage[]): ModelMessage[] {
    const totalMessages = messages.length;
    const lastUserMessageIndex = messages.findLastIndex((message) => message.role === 'user');
    const lastAssistantMessageIndex = messages.findLastIndex(
        (message) => message.role === 'assistant',
    );

    const uiMessages = messages.map((message, index) => {
        const opt: HydrateMessageOptions = {
            totalMessages,
            currentMessageIndex: index,
            lastUserMessageIndex,
            lastAssistantMessageIndex,
        };
        return toVercelMessageFromOnlook(message, opt);
    });

    return convertToModelMessages(uiMessages);
}

export const toVercelMessageFromOnlook = (
    message: ChatMessage,
    opt: HydrateMessageOptions,
): VercelMessage => {
    const parts = filterReasoningParts(message.parts);
    if (message.role === 'assistant') {
        return {
            ...message,
            parts,
        } satisfies VercelMessage;
    } else if (message.role === 'user') {
        const hydratedMessage = getHydratedUserMessage(
            message.id,
            parts,
            message.metadata?.context ?? [],
            opt,
        );
        return hydratedMessage;
    }
    return message;
};

export const filterReasoningParts = (parts: ChatMessage['parts']): ChatMessage['parts'] => {
    return parts.filter((part) => part.type !== 'reasoning');
};

export const ensureToolResultParts = (parts: ChatMessage['parts']): ChatMessage['parts'] => {
    const processedParts = [...parts];

    for (let i = 0; i < processedParts.length; i++) {
        const part = processedParts[i];

        if (!part) continue;

        // Check if this is a tool part that needs completion
        if (part.type.startsWith('tool-') && 'toolCallId' in part && 'state' in part) {
            // If tool call is in streaming state, mark it as having input available
            if (part.state === 'input-streaming') {
                const updatedPart = {
                    ...part,
                    state: 'input-available' as const,
                };
                processedParts[i] = updatedPart;
            }
        }
    }

    return processedParts;
};
