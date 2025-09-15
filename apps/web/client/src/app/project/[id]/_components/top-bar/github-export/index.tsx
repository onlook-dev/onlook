import { useEditorEngine } from '@/components/store/editor';
import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { GitHubExportDropdown } from './dropdown';
import { TriggerButton } from './trigger-button';

export const GitHubExportButton = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <DropdownMenu
            modal={false}
            open={editorEngine.state.githubExportOpen}
            onOpenChange={(open: boolean) => {
                editorEngine.state.setGithubExportOpen(open);
            }}
        >
            <TriggerButton />
            <DropdownMenuContent align="end" className="w-96 p-0 text-sm">
                <GitHubExportDropdown />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});