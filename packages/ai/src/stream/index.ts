import { ChatMessageRole, type ChatMessage } from '@onlook/models';
import {
    convertToModelMessages,
    type ModelMessage,
    type TextPart,
    type ToolInvocation,
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
    // const messageContent = extractTextFromParts(message.content.parts);

    if (message.role === ChatMessageRole.ASSISTANT) {
        return {
            ...message,
            parts: message.content.parts,
            // content: messageContent,
        } satisfies VercelMessage;
    } else if (message.role === ChatMessageRole.USER) {
        const hydratedMessage = getHydratedUserMessage(
            message.id,
            message.content.parts,
            message.content?.metadata?.context ?? [],
            opt,
        );
        return hydratedMessage;
    }
    return message;
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
): VercelMessage['parts'] => {
    return parts?.map((part) => {
        if (part.type === 'tool-invocation') {
            const toolInvocation = part.toolInvocation;
            const toolSignature = getToolSignature(toolInvocation);
            const isLastAssistantMessage =
                opt.currentMessageIndex === opt.lastAssistantMessageIndex;
            if (toolCallSignatures.get(toolSignature) && !isLastAssistantMessage) {
                return getTruncatedToolInvocation(toolInvocation);
            }
            toolCallSignatures.set(toolSignature, part.toolInvocation.toolCallId);
        }
        return part;
    });
};

const getToolSignature = (toolInvocation: ToolInvocation): string => {
    const toolName = toolInvocation.toolName;
    const args = toolInvocation.args;
    const result = toolInvocation.state === 'result' ? toolInvocation.result : '';
    return `${toolName}-${JSON.stringify(args)}-${JSON.stringify(result)}`;
};

const getTruncatedToolInvocation = (toolInvocation: ToolInvocation): TextPart => {
    return {
        type: 'text',
        text: `Truncated tool invocation. Exact same tool invocation as tool name ${toolInvocation.toolName} and ID: ${toolInvocation.toolCallId}`,
    };
};
