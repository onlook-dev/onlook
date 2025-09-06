import { ChatMessageRole, type ChatMessage } from '@onlook/models';
import {
    convertToModelMessages,
    type ModelMessage,
    type TextPart,
    type UIMessage as VercelMessage,
} from 'ai';
import { getHydratedUserMessage, type HydrateMessageOptions } from '../prompt';

export function convertToStreamMessages(messages: ChatMessage[]): ModelMessage[] {
    const totalMessages = messages.length;
    const lastUserMessageIndex = messages.findLastIndex(
        (message) => message.role === ChatMessageRole.USER,
    );
    const lastAssistantMessageIndex = messages.findLastIndex(
        (message) => message.role === ChatMessageRole.ASSISTANT,
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
    if (message.role === ChatMessageRole.ASSISTANT) {
        return {
            ...message,
            parts: message.parts,
        } satisfies VercelMessage;
    } else if (message.role === ChatMessageRole.USER) {
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
