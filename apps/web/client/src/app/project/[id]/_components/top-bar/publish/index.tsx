import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { PublishDropdown } from './dropdown';
import { PublishButton } from './trigger-button';
import { useUserManager } from '@/components/store/user';
import { useEditorEngine } from '@/components/store/editor';

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
