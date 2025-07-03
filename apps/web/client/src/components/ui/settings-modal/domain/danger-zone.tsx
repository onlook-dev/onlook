import { useHosting } from '@/app/project/[id]/_components/top-bar/publish/use-hosting';
import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { DeploymentStatus, DeploymentType } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';

export const DangerZone = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();

    const { data: domains } = api.domain.getAll.useQuery({ projectId: editorEngine.projectId });
    const { deployment, unpublish: runUnpublish, isDeploying } = useHosting(DeploymentType.UNPUBLISH_ALL);
    const previewDomain = domains?.preview;
    const customDomain = domains?.published;

    const isUnpublishing = deployment?.status === DeploymentStatus.PENDING;

    const unpublish = async (type: DeploymentType) => {
        const response = await runUnpublish(editorEngine.projectId, type);

        if (!response) {
            toast.error('Failed to unpublish project', {
                description: 'Please try again.',
            });
        } else {
            toast.success('Project unpublished', {
                description: 'Your project is no longer publicly accessible.',
            });
            stateManager.isSettingsModalOpen = false;
            editorEngine.state.publishOpen = true;
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg">Danger Zone</h2>
            <div className="flex flex-col gap-4">
                <div className="flex flex-row gap-2 items-center">
                    <p className="text-sm text-muted-foreground">
                        {!previewDomain
                            ? 'Your domain is not published'
                            : `Unpublish from ${previewDomain.url}`}
                    </p>
                    <Button
                        onClick={() => {
                            if (previewDomain) {
                                unpublish(DeploymentType.UNPUBLISH_PREVIEW);
                            }
                        }}
                        className="ml-auto"
                        size="sm"
                        variant="destructive"
                        disabled={!previewDomain || isUnpublishing}
                    >
                        {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                </div>
                {customDomain && (
                    <div className="flex flex-row gap-2 items-center">
                        <p className="text-sm text-muted-foreground">
                            Unpublish from {customDomain.url}
                        </p>
                        <Button
                            onClick={() => unpublish(DeploymentType.UNPUBLISH_CUSTOM)}
                            className="ml-auto"
                            size="sm"
                            variant="destructive"
                            disabled={!customDomain || isUnpublishing}
                        >
                            {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});
