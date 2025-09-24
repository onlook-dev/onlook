import { observer } from 'mobx-react-lite';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

import { useEditorEngine } from '@/components/store/editor';

export const NoSavedVersions = observer(() => {
    const editorEngine = useEditorEngine();

    const handleSaveLatestCommit = async () => {
        editorEngine.versions?.saveLatestCommit();
    };

    return (
        <div className="flex flex-col items-center gap-2 rounded border border-dashed p-12">
            <div className="">No saved versions</div>
            <div className="text-muted-foreground text-center">
                Your saved backups will appear here
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveLatestCommit}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add current version
            </Button>
        </div>
    );
});
