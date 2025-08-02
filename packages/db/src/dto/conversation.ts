import type { StorageThreadType } from "@mastra/core/memory";
import { type ChatConversation, type ChatSuggestion } from "@onlook/models";

export const toOnlookConversationFromMastra = (mastraThread: StorageThreadType): ChatConversation => {
    return {
        ...mastraThread,
        projectId: mastraThread.resourceId,
        metadata: {
            suggestions: getOnlookSuggestionsFromMastra(mastraThread),
        }
    }
}

export const fromOnlookConversationToMastra = (conversation: ChatConversation): StorageThreadType => {
    return {
        ...conversation,
        resourceId: conversation.projectId,
    }
}

const getOnlookSuggestionsFromMastra = (mastraThread: StorageThreadType): ChatSuggestion[] => {
    return mastraThread.metadata?.suggestions as ChatSuggestion[] || [];
}