import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
import { api } from '@/trpc/react';
import { DeploymentStatus, DeploymentType } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';

export const DangerZone = observer(() => {
    const editorEngine = useEditorEngine();

    const { data: domains } = api.domain.getAll.useQuery({ projectId: editorEngine.projectId });
    const { deployment: unpublishPreviewDeployment, unpublish: runUnpublishPreview } = useHostingType(DeploymentType.UNPUBLISH_PREVIEW);
    const { deployment: unpublishCustomDeployment, unpublish: runUnpublishCustom } = useHostingType(DeploymentType.UNPUBLISH_CUSTOM);

    const previewDomain = domains?.preview;
    const customDomain = domains?.published;

    const unpublish = async (type: DeploymentType) => {
        let unpublishResponse: {
            deploymentId: string;
        } | null = null;
        if (type === DeploymentType.UNPUBLISH_PREVIEW) {
            unpublishResponse = await runUnpublishPreview(editorEngine.projectId);
        } else {
            unpublishResponse = await runUnpublishCustom(editorEngine.projectId);
        }

        if (unpublishResponse) {
            toast.success('Project is being unpublished', {
                description: 'Deployment ID: ' + unpublishResponse.deploymentId,
            });
        } else {
            toast.error('Failed to unpublish project', {
                description: 'Please try again.',
            });
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
                        disabled={!previewDomain || unpublishPreviewDeployment?.status === DeploymentStatus.IN_PROGRESS}
                    >
                        {unpublishPreviewDeployment?.status === DeploymentStatus.IN_PROGRESS ? 'Unpublishing...' : 'Unpublish'}
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
                            disabled={!customDomain || unpublishCustomDeployment?.status === DeploymentStatus.IN_PROGRESS}
                        >
                            {unpublishCustomDeployment?.status === DeploymentStatus.IN_PROGRESS ? 'Unpublishing...' : 'Unpublish'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});
