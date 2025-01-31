import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import AssistantMessage from './AssistantMessage';

export const StreamingMessage = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <>
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full h-full flex-row items-center gap-2 p-4 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {editorEngine.chat.streamingMessage && (
                <AssistantMessage message={editorEngine.chat.streamingMessage} />
            )}
        </>
    );
});

export default StreamingMessage;
