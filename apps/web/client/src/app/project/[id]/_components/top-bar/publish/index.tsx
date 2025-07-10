import { useEditorEngine } from '@/components/store/editor';
import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { PublishDropdown } from './dropdown';
import { TriggerButton } from './trigger-button';

export const PublishButton = observer(() => {
    const editorEngine = useEditorEngine();

    // To view the publish modal UI without publishing:
    // 1. Open browser dev tools console
    // 2. Run: window.editorEngine.state.publishOpen = true
    // 3. The modal will open and you can inspect the UI
    // 4. To close: window.editorEngine.state.publishOpen = false

    return (
        <DropdownMenu
            modal={false}
            open={editorEngine.state.publishOpen}
            onOpenChange={(open: boolean) => {
                editorEngine.state.publishOpen = open;
            }}
        >
            <TriggerButton />
            <DropdownMenuContent align="end" className="w-[425px] p-0 text-sm">
                <PublishDropdown />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
