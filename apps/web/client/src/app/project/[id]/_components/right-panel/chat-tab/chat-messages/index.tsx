import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { ChatMessageList } from '@onlook/ui/chat/chat-message-list';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { ErrorMessage } from './error-message';
import { MessageList } from './message-list';
import { StreamMessage } from './stream-message';

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const conversation = editorEngine.chat.conversation.current;

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-row items-center justify-center text-foreground-tertiary/80 h-full gap-2">
                <Icons.LoadingSpinner className="animate-spin" />
                <p className="text-regularPlus">Loading conversation...</p>
            </div>
        );
    }

    const engineMessages = editorEngine.chat.conversation.current?.messages;
    if (!engineMessages || engineMessages.length === 0) {
        return (
            !editorEngine.elements.selected.length && (
                <div className="flex-1 flex flex-col items-center justify-center text-foreground-tertiary/80 h-full">
                    <Icons.EmptyState className="size-32" />
                    <p className="text-center text-regularPlus text-balance max-w-[300px]">
                        {t(transKeys.editor.panels.edit.tabs.chat.emptyState)}
                    </p>
                </div>
            )
        );
    }

    return (
        <ChatMessageList contentKey={engineMessages.map((m) => m.id).join('|')}>
            <MessageList />
            <StreamMessage />
            <ErrorMessage />
        </ChatMessageList>
    );
});
