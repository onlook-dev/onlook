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
    if (message.role === 'assistant') {
        return {
            ...message,
            parts: message.parts,
        } satisfies VercelMessage;
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
