import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { ChatInput } from './ChatInput';
import ChatMessages from './ChatMessages';

const ChatTab = observer(() => {
    return (
        <div className="w-full h-[calc(100vh-8.25rem)] flex flex-col justify-end">
            <ChatMessages />
            <TestErrorButton />
            <ChatInput />
        </div>
    );
});

export default ChatTab;

const TestErrorButton = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <div className="flex flex-col gap-4 text-xs m-4">
            {editorEngine.errors.errors.map((error) =>
                error.map(
                    (e) =>
                        e.type !== 'UNKNOWN' && (
                            <div key={e.message}>
                                <div>{e.type}</div>
                                <div>
                                    {e.filePath}
                                    {e.line}:{e.column} - {e.message}
                                </div>
                                <Button onClick={() => console.log(e)}>Solve</Button>
                            </div>
                        ),
                ),
            )}
        </div>
    );
});
