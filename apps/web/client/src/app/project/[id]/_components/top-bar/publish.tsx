import { useEditorEngine, useUserManager } from '@/components/Context';
import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { PublishDropdown } from './Dropdown';
import { PublishButton } from './TriggerButton';

const Publish = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();

    useEffect(() => {
        userManager.subscription.getPlanFromServer();
    }, [editorEngine.isPublishOpen]);

    return (
        <DropdownMenu
            open={editorEngine.isPublishOpen}
            onOpenChange={(open: boolean) => {
                editorEngine.isPublishOpen = open;
            }}
        >
            <PublishButton />
            <DropdownMenuContent align="end" className="w-96 p-0 text-sm">
                <PublishDropdown />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

export default Publish;
