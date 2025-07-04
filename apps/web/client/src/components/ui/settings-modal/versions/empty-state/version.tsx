import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';

export const NoVersions = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <div className="flex flex-col items-center gap-2 border border-dashed rounded p-12 mt-4">
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
                    <Icons.Shadow className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Icons.Plus className="h-4 w-4 mr-2" />
                )}
                {editorEngine.versions.isSaving ? 'Saving...' : 'Create backup'}
            </Button>
        </div>
    );
});