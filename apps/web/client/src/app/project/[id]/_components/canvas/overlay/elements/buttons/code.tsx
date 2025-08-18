import { useEditorEngine } from '@/components/store/editor';
import { EditorTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

export const OverlayOpenCode = observer(({ isInputting }: { isInputting: boolean }) => {
    const editorEngine = useEditorEngine();
    const isDevMode = editorEngine.state.rightPanelTab === EditorTabValue.DEV;
    const oid = editorEngine.elements.selected[0]?.oid;

    if (isDevMode || isInputting || !oid) {
        return null;
    }

    const handleCodeButtonClick = async () => {
        await editorEngine.code.viewCodeBlock(oid)
    };

    return (
        <div
            className={cn(
                'rounded-xl backdrop-blur-lg transition-all duration-300',
                'shadow-xl shadow-background-secondary/50',
                'bg-background-secondary/85 dark:bg-background/85 border-foreground-secondary/20 hover:border-foreground-secondary/50 p-0.5',
                'border flex relative',
            )}
        >
            <button
                onClick={handleCodeButtonClick}
                className="rounded-lg hover:text-foreground-primary transition-colors px-1.5 py-1.5 flex flex-row items-center gap-2 w-full"
                title="Open in Code"
            >
                <Icons.Code className="w-4 h-4" />
            </button>
        </div>
    )
});