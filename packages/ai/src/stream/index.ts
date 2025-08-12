import { ChatMessageRole, type ChatMessage } from '@onlook/models';
import {
    convertToModelMessages,
    type ModelMessage,
    type TextPart,
    type UIMessage,
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
    const toolCallSignatures = new Map<string, string>();

    const uiMessages = messages.map((message, index) => {
        const opt: HydrateMessageOptions = {
            totalMessages,
            currentMessageIndex: index,
            lastUserMessageIndex,
            lastAssistantMessageIndex,
        };
        return toVercelMessageFromOnlook(message, opt, toolCallSignatures);
    });
    return convertToModelMessages(uiMessages);
}

export const toVercelMessageFromOnlook = (
    message: ChatMessage,
    opt: HydrateMessageOptions,
    toolCallSignatures: Map<string, string>,
): UIMessage => {
    const messageContent = extractTextFromParts(message.content.parts);
    if (message.role === ChatMessageRole.ASSISTANT) {
        return {
            id: message.id,
            role: 'assistant',
            parts: getAssistantParts(message.content.parts, toolCallSignatures, opt) ?? [],
        } satisfies UIMessage;
    } else if (message.role === ChatMessageRole.USER) {
        const hydratedMessage = getHydratedUserMessage(
            message.id,
            messageContent,
            message.content.metadata?.context ?? [],
            opt,
        );
        return hydratedMessage;
    }
    // Default fallback; should not happen
    return {
        id: message.id,
        role: 'assistant',
        parts: [],
    } satisfies UIMessage;
};

export const extractTextFromParts = (parts: ChatMessage['content']['parts']): string => {
    return parts
        ?.map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        })
        .join('');
};

export const getAssistantParts = (
    parts: ChatMessage['content']['parts'] | undefined,
    toolCallSignatures: Map<string, string>,
    opt: HydrateMessageOptions,
): any => {
    return parts?.map((part) => {
        if (part.type === 'tool-invocation') {
            const toolInvocation = part as any;
            const toolSignature = getToolSignature(toolInvocation);
            const isLastAssistantMessage =
                opt.currentMessageIndex === opt.lastAssistantMessageIndex;
            if (toolCallSignatures.get(toolSignature) && !isLastAssistantMessage) {
                return getTruncatedToolInvocation(toolInvocation);
            }
            toolCallSignatures.set(toolSignature, (toolInvocation as any).toolCallId);
        }
        return part;
    });
};

const getToolSignature = (toolInvocation: any): string => {
    const toolName = toolInvocation.toolName;
    const input = toolInvocation.input;
    const output = toolInvocation.state === 'result' ? toolInvocation.output : '';
    return `${toolName}-${JSON.stringify(input)}-${JSON.stringify(output)}`;
};

const getTruncatedToolInvocation = (toolInvocation: any): TextPart => {
    return {
        type: 'text',
        text: `Truncated tool invocation. Exact same tool invocation as tool name ${toolInvocation.toolName} and ID: ${toolInvocation.toolCallId}`,
    };
};
