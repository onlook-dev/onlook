import { useEditorEngine } from '@/components/store';
import { ChatMessageRole } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { AssistantChatMessageImpl } from '@/components/store/editor/engine/chat/message/assistant';
import { AssistantMessage } from './assistant-message';
import type { UserChatMessageImpl } from '@/components/store/editor/engine/chat/message/user';
import type { ToolChatMessageImpl } from '@/components/store/editor/engine/chat/message/tool';
import { UserMessage } from './user-message';
import { ErrorMessage } from './error-message';
import { StreamMessage } from './stream-message';
export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [editorEngine.chat.conversation.current?.messages.length]);

    const renderMessage = useCallback(
        (message: AssistantChatMessageImpl | UserChatMessageImpl | ToolChatMessageImpl) => {
            let messageNode;
            switch (message.role) {
                case ChatMessageRole.ASSISTANT:
                    messageNode = <AssistantMessage message={message} />;
                    break;
                case ChatMessageRole.USER:
                    messageNode = <UserMessage message={message} />;
                    break;
                case ChatMessageRole.TOOL:
                    // No need to render tool results messages
                    break;
            }
            return <div key={message.id}>{messageNode}</div>;
        },
        [],
    );

    

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
                // Only show empty state if no elements are selected
                !editorEngine.elements.selected.length && (
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
                )
            )}
        </AnimatePresence>
    );
});
