import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { PublishDropdown } from './dropdown';
import { PublishButton } from './trigger-button';
import { useEditorEngine } from '@/components/store/editor';

export const Publish = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <DropdownMenu
            open={editorEngine.state.publishOpen}
            onOpenChange={(open: boolean) => {
                editorEngine.state.publishOpen = open;
            }}
        >
            <PublishButton />
            <DropdownMenuContent align="end" className="w-96 p-0 text-sm">
                <PublishDropdown />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
