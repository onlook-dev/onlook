import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';

export const Suggestions = observer(({ setInput }: { setInput: (input: string) => void }) => {
    const editorEngine = useEditorEngine();
    return (
        <div className="flex flex-col gap-2 p-2">
            {editorEngine.chat.suggestions.suggestions.map((suggestion) => (
                <button
                    key={suggestion}
                    className="text-sm flex border border-blue-500/20 items-center gap-2 p-3 text-left text-blue-300 bg-blue-500/10 rounded-lg transition-colors relative  hover:bg-blue-500/20"
                    onClick={() => setInput(suggestion)}
                >
                    <Icons.Sparkles className="w-4 h-4" />
                    {suggestion}
                </button>
            ))}
        </div>
    );
});
