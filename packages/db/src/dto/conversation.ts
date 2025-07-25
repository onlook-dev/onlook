import type { StorageThreadType } from "@mastra/core/memory";
import { type ChatConversation } from "@onlook/models";

export const toOnlookConversationFromMastra = (mastraThread: StorageThreadType): ChatConversation => {
    return {
        ...mastraThread,
        projectId: mastraThread.resourceId,
    }
}

export const fromOnlookConversationToMastra = (conversation: ChatConversation): StorageThreadType => {
    return {
        ...conversation,
        resourceId: conversation.projectId,
    }
}