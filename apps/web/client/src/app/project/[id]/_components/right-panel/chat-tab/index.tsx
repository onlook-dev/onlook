import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons/index';
import { useEffect, useMemo, useState } from 'react';
import { ChatConversation } from './chat-conversation';
import { ChatHeader } from './chat-header';

interface ChatTabProps {
    conversationId: string;
    projectId: string;
}

export const ChatTab = ({ conversationId, projectId }: ChatTabProps) => {
    const editorEngine = useEditorEngine();
    
    // Ensure the current conversation is added to multi-chat system
    useEffect(() => {
        const currentConversation = editorEngine.chat.conversation.current;
        if (currentConversation && !editorEngine.chat.multiChat.getChatById(currentConversation.id)) {
            editorEngine.chat.multiChat.addChat(currentConversation);
        }
    }, [editorEngine.chat, conversationId]);

    // Get current state without observer
    const selectedChatId = editorEngine.chat.multiChat.selectedChatId;
    const activeChats = editorEngine.chat.multiChat.activeChats;

    // Memoize the chat conversations to prevent infinite re-renders
    const chatConversations = useMemo(() => {
        return activeChats.map((chat) => {
            const isActive = selectedChatId === chat.id;
            
            return (
                <ChatConversation
                    key={chat.id}
                    conversationId={chat.id}
                    projectId={projectId}
                    isActive={isActive}
                />
            );
        });
    }, [activeChats, selectedChatId, projectId]);

    return (
        <div className="flex flex-col h-full">
            <ChatHeader />
            <div className="flex-1 overflow-hidden relative">
                {chatConversations}
            </div>
        </div>
    );
};
