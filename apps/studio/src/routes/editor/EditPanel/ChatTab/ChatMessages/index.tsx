import { useEditorEngine } from '@/components/Context';
import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { ChatMessageType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import AssistantMessage from './AssistantMessage';
import StreamMessage from './StreamMessage';
import UserMessage from './UserMessage';

const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [editorEngine.chat.conversation.current?.messages.length]);

    const renderMessage = useCallback((message: AssistantChatMessageImpl | UserChatMessageImpl) => {
        let messageNode;
        switch (message.type) {
            case ChatMessageType.ASSISTANT:
                messageNode = <AssistantMessage message={message} />;
                break;
            case ChatMessageType.USER:
                messageNode = <UserMessage message={message} />;
                break;
        }
        return <div key={message.id}>{messageNode}</div>;
    }, []);

    function renderErrorMessage() {
        const rateLimited = editorEngine.chat.stream.rateLimited;
        if (rateLimited) {
            const requestLimit =
                rateLimited.reason === 'daily'
                    ? rateLimited.daily_requests_limit
                    : rateLimited.monthly_requests_limit;

            return (
                <div className="flex w-full flex-col items-center justify-center gap-2 text-small px-4 pb-4">
                    <p className="text-foreground-secondary text-mini my-1 text-blue-300 select-none">
                        You reached your {rateLimited.reason} {requestLimit} message limit.
                    </p>
                    <Button
                        className="w-full mx-10 bg-blue-500 text-white border-blue-400 hover:border-blue-200/80 hover:text-white hover:bg-blue-400 shadow-blue-500/50 hover:shadow-blue-500/70 shadow-lg transition-all duration-300"
                        onClick={() => (editorEngine.isPlansOpen = true)}
                    >
                        Get unlimited {rateLimited.reason} messages
                    </Button>
                </div>
            );
        }

        const errorMessage = editorEngine.chat.stream.errorMessage;
        if (errorMessage) {
            return (
                <div className="flex w-full flex-row items-center justify-center gap-2 p-2 text-small text-red">
                    <Icons.ExclamationTriangle className="w-6" />
                    <p className="w-5/6 text-wrap overflow-auto">{errorMessage}</p>
                </div>
            );
        }
    }

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
                    {renderErrorMessage()}
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
                        Select an element <br /> to chat with AI
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default ChatMessages;
