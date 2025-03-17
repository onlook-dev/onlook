import { useEditorEngine } from '@/components/Context';
import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { ChatMessageRole } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantMessage } from './AssistantMessage';
import { ErrorMessage } from './ErrorMessage';
import { StreamMessage } from './StreamMessage';
import { UserMessage } from './UserMessage';

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [editorEngine.chat.conversation.current?.messages.length]);

    const renderMessage = useCallback((message: AssistantChatMessageImpl | UserChatMessageImpl) => {
        let messageNode;
        switch (message.role) {
            case ChatMessageRole.ASSISTANT:
                messageNode = <AssistantMessage message={message} />;
                break;
            case ChatMessageRole.USER:
                messageNode = <UserMessage message={message} />;
                break;
        }
        return <div key={message.id}>{messageNode}</div>;
    }, []);

    // Render in reverse order to make the latest message appear at the bottom
    return (
        <AnimatePresence mode="wait">
            {editorEngine.chat.conversation.current &&
            editorEngine.chat.conversation.current?.messages.length !== 0 ? (
                <motion.div
                    className="flex flex-col-reverse gap-2 select-text overflow-auto"
                    ref={chatMessagesRef}
                    key="conversation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <StreamMessage />
                    <ErrorMessage />
                    {[...editorEngine.chat.conversation.current.messages]
                        .reverse()
                        .map((message) => renderMessage(message))}
                </motion.div>
            ) : (
                <motion.div
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col items-center justify-center text-foreground-tertiary/80"
                >
                    <div className="w-32 h-32">
                        <Icons.EmptyState className="w-full h-full" />
                    </div>
                    <p className="text-center text-regularPlus text-balance max-w-[300px]">
                        {t('editor.panels.edit.tabs.chat.emptyState')}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
