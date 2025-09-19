import { api } from "@/trpc/client";
import type { GitCommit } from "@onlook/git";
import { type ChatMessage, MessageCheckpointType, type MessageContext } from "@onlook/models";
import { v4 as uuidv4 } from 'uuid';

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


export const attachCommitToUserMessage = (commit: GitCommit, message: ChatMessage, conversationId: string) => {
    // Vercel converts createdAt to a string, which our API doesn't accept.
    const oldCheckpoints = message.metadata?.checkpoints.map((checkpoint) => ({
        ...checkpoint,
        createdAt: new Date(checkpoint.createdAt),
    })) ?? [];
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

    // Very hacky - but since we only save messages when we submit a new message, we need to update the checkpoints here.
    void api.chat.message.updateCheckpoints.mutate({
        messageId: message.id,
        checkpoints: newCheckpoints,
    });
    
    return message;
}
