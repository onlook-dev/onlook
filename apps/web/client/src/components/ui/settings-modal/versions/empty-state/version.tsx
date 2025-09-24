import { observer } from 'mobx-react-lite';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

import { useEditorEngine } from '@/components/store/editor';

export const NoVersions = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <div className="mt-4 flex flex-col items-center gap-2 rounded border border-dashed p-12">
            <div className="">No backups</div>
            <div className="text-muted-foreground text-center">
                Create your first backup with the <br /> current version
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => editorEngine.versions.initializeRepo()}
                disabled={editorEngine.versions.isSaving}
            >
                {editorEngine.versions.isSaving ? (
                    <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.Plus className="mr-2 h-4 w-4" />
                )}
                {editorEngine.versions.isSaving ? 'Saving...' : 'Create backup'}
            </Button>
        </div>
    );
});
