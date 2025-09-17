import { type ChatMessage } from '@onlook/models';
import { convertToModelMessages, type ModelMessage } from 'ai';
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
        return toVercelMessageFromOnlook(message, opt);
    });

    return convertToModelMessages(streamMessages);
}

export const toVercelMessageFromOnlook = (
    message: ChatMessage,
    opt: HydrateMessageOptions,
): ChatMessage => {
    if (message.role === 'assistant') {
        return {
            ...message,
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
