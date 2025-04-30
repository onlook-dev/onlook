import { useEditorEngine } from '@/components/store';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { createContext, useContext } from 'react';

const ChatContext = createContext<UseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const chat = useChat({
        id: 'user-chat', api: '/api/chat', onFinish: (message) => {
            editorEngine.chat.conversation.addAssistantMessage(message);
        }
    });
    return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    return context;
}
