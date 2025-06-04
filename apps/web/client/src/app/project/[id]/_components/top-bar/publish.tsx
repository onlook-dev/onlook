import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { PublishDropdown } from './publish/dropdown';
import { PublishButton } from './publish/trigger-button';

export const Publish = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();

    useEffect(() => {
        userManager.subscription.getPlanFromServer();
    }, [editorEngine.state.publishOpen]);

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