import { useEditorEngine } from '@/components/store/editor';
import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { PublishStatus } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';

export const DangerZone = observer(() => {
    const domainsManager = useDomainsManager();
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();
    const hostingManager = editorEngine.hosting;
    const previewDomain = domainsManager.domains.preview;
    const customDomain = domainsManager.domains.custom;
    const project = projectManager.project;

    if (!project) {
        return <div>No project found</div>;
    }

    const isUnpublishing = hostingManager?.state.status === PublishStatus.LOADING;

    const unpublish = async (urls: string[]) => {
        const success = await hostingManager.unpublish(project.id, urls);

        if (!success) {
            toast.error('Failed to unpublish project', {
                description: 'Please try again.',
            });
        } else {
            toast.success('Project unpublished', {
                description: 'Your project is no longer publicly accessible.',
            });
            editorEngine.state.settingsOpen = false;
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
                                unpublish([previewDomain.url]);
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
                            onClick={() => unpublish([customDomain.url])}
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
