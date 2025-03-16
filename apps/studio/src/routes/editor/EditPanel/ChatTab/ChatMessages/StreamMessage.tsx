import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import MarkdownRenderer from './MarkdownRenderer';

export const StreamingMessage = observer(() => {
    const editorEngine = useEditorEngine();
    const content = editorEngine.chat.stream.content;

    const renderMessageContent = () => {
        if (typeof content === 'string') {
            return <MarkdownRenderer content={content} applied={false} />;
        }
        return content.map((part) => {
            if (part.type === 'text') {
                return <MarkdownRenderer key={part.text} content={part.text} applied={false} />;
            } else if (part.type === 'tool-call') {
                return (
                    <div key={part.toolCallId} className="border-2 border-red-500">
                        tool call: {JSON.stringify(part, null, 2)}
                    </div>
                );
            }
        });
    };

    return (
        <>
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            <div className="px-4 py-2 text-small content-start">
                <div className="flex flex-col text-wrap gap-2">{renderMessageContent()}</div>
            </div>
        </>
    );
});

export default StreamingMessage;
