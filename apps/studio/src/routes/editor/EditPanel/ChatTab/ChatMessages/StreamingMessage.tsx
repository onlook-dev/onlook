import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import type { FC } from 'react';
import AssistantMessage from './AssistantMessage';

const StreamingMessageComponent: FC = observer(() => {
    const editorEngine = useEditorEngine();

    if (!editorEngine.chat.streamingMessage) {
        if (editorEngine.chat.isWaiting) {
            return (
                <div className="flex w-full flex-row items-center gap-2 p-4 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            );
        }
        return null;
    }

    return <AssistantMessage message={editorEngine.chat.streamingMessage} />;
});

const StreamingMessage = StreamingMessageComponent;
export default StreamingMessage;
