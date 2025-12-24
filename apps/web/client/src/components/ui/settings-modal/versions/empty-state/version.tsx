import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const NoVersions = observer(() => {
    const editorEngine = useEditorEngine();
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateBackup = async () => {
        try {
            setIsCreating(true);
            const branchData = editorEngine.branches.activeBranchData;

            if (!branchData) {
                throw new Error('No active branch available to create backup');
            }

            const result = await branchData.sandbox.gitManager.createCommit('Initial commit');
            if (!result.success) {
                throw new Error(result.error || 'Failed to create backup');
            }

            toast.success('Backup created successfully!');
            editorEngine.posthog.capture('versions_create_first_commit');
        } catch (error) {
            toast.error('Failed to create backup', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 border border-dashed rounded p-12 mt-4">
            <div className="">No backups</div>
            <div className="text-muted-foreground text-center">
                Create your first backup with the <br /> current version
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleCreateBackup}
                disabled={isCreating}
            >
                {isCreating ? (
                    <Icons.Shadow className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Icons.Plus className="h-4 w-4 mr-2" />
                )}
                {isCreating ? 'Saving...' : 'Create backup'}
            </Button>
        </div>
    );
});