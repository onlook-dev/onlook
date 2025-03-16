import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import MarkdownRenderer from './MarkdownRenderer';

export const StreamingMessage = observer(() => {
    const editorEngine = useEditorEngine();

    const renderStreamContent = () => {
        if (editorEngine.chat.stream.content) {
            return editorEngine.chat.stream.content.map((part) => {
                if (part.type === 'text-delta') {
                    return (
                        <MarkdownRenderer
                            key={part.textDelta}
                            content={part.textDelta}
                            applied={false}
                        />
                    );
                }
            });
        }
        return null;
    };
    return (
        <>
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {renderStreamContent()}
        </>
    );
});

export default StreamingMessage;
