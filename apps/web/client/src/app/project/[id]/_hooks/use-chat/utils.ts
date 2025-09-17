import { type ChatMessage, MessageCheckpointType, type MessageContext } from "@onlook/models";
import type { GitCommit } from "@onlook/git";
import { v4 as uuidv4 } from 'uuid';
import { api } from "@/trpc/client";

export const prepareMessagesForSuggestions = (messages: ChatMessage[]) => {
    return messages.slice(-5).map((message) => ({
        role: message.role,
        content: message.parts.map((p) => {
            if (p.type === 'text') {
                return p.text;
            }
            return '';
        }).join(''),
    }));
};

export const getUserChatMessageFromString = (
    content: string,
    context: MessageContext[],
    conversationId: string,
    id?: string,
): ChatMessage => {
    return {
        id: id ?? uuidv4(),
        role: 'user',
        parts: [{ type: 'text', text: content }],
        metadata: {
            context,
            checkpoints: [],
            createdAt: new Date(),
            conversationId,
        },
    }
}

export const attachCommitToUserMessage = async (commit: GitCommit, message: ChatMessage, conversationId: string): Promise<void> => {
    // Vercel converts createdAt to a string, which our API doesn't accept.
    const oldCheckpoints = (message.metadata?.checkpoints ?? []).map((checkpoint) => ({
        ...checkpoint,
        createdAt: new Date(checkpoint.createdAt),
    }));
    const newCheckpoints = [
        ...oldCheckpoints,
        {
            type: MessageCheckpointType.GIT,
            oid: commit.oid,
            createdAt: new Date(),
        },
    ];

    message.metadata = {
        ...message.metadata,
        createdAt: message.metadata?.createdAt ?? new Date(),
        conversationId,
        checkpoints: newCheckpoints,
        context: message.metadata?.context ?? [],
    };
    await api.chat.message.updateCheckpoints.mutate({
        messageId: message.id,
        checkpoints: newCheckpoints,
    });
}
