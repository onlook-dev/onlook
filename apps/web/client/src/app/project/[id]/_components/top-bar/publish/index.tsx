import { observer } from 'mobx-react-lite';

import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';

import { useEditorEngine } from '@/components/store/editor';
import { PublishDropdown } from './dropdown';
import { TriggerButton } from './trigger-button';

export const PublishButton = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <DropdownMenu
            modal={false}
            open={editorEngine.state.publishOpen}
            onOpenChange={(open: boolean) => {
                editorEngine.state.publishOpen = open;
            }}
        >
            <TriggerButton />
            <DropdownMenuContent align="end" className="w-96 p-0 text-sm">
                <PublishDropdown />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
