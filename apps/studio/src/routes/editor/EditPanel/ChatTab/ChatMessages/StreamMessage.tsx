import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import type { AssistantContent } from 'ai';
import { observer } from 'mobx-react-lite';
import { MessageContent } from './MessageContent';

export const StreamMessage = observer(() => {
    const editorEngine = useEditorEngine();
    const content = editorEngine.chat.stream.content;
    const messageId = editorEngine.chat.stream.id;

    return (
        <>
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {content.length > 0 && (
                <div className="px-4 py-2 text-small content-start">
                    <div className="flex flex-col text-wrap gap-2">
                        <MessageContent
                            messageId={messageId}
                            content={content as AssistantContent}
                            applied={false}
                            isStream={true}
                        />
                    </div>
                </div>
            )}
        </>
    );
});
