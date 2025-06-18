import { useProjectManager } from '@/components/store/project';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';

export const NoSavedVersions = observer(() => {
    const projectsManager = useProjectManager();

    const handleSaveLatestCommit = async () => {
        projectsManager.versions?.saveLatestCommit();
    };

    return (
        <div className="flex flex-col items-center gap-2 border border-dashed rounded p-12">
            <div className="">No saved versions</div>
            <div className="text-muted-foreground text-center">
                Your saved backups will appear here
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveLatestCommit}>
                <Icons.Plus className="h-4 w-4 mr-2" />
                Add current version
            </Button>
        </div>
    );
});