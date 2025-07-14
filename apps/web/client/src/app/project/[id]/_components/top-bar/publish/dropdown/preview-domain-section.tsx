import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
import { api } from '@/trpc/react';
import { DeploymentStatus, DeploymentType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { toast } from '@onlook/ui/sonner';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import stripAnsi from 'strip-ansi';
import { UrlSection } from './url';

export const PreviewDomainSection = observer(() => {
    const editorEngine = useEditorEngine();
    const [isLoading, setIsLoading] = useState(false);
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { data: previewDomain, refetch: refetchPreviewDomain } = api.domain.preview.get.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: createPreviewDomain, isPending: isCreatingDomain } = api.domain.preview.create.useMutation();
    const { deployment, publish: runPublish, isDeploying } = useHostingType(DeploymentType.PREVIEW);

    const createBaseDomain = async (): Promise<void> => {
        const previewDomain = await createPreviewDomain({ projectId: editorEngine.projectId });
        if (!previewDomain) {
            console.error('Failed to create preview domain');
            toast.error('Failed to create preview domain');
            return;
        }
        await refetchPreviewDomain();
        publish();
    };

    const publish = async (): Promise<void> => {
        if (!project) {
            console.error('No project found');
            toast.error('No project found');
            return;
        }
        setIsLoading(true);
        try {
            await runPublish({
                projectId: editorEngine.projectId
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const retry = () => {
        if (!previewDomain?.url) {
            console.error(`No preview domain info found`);
            return;
        }
        publish();
    };

    const renderDomain = () => {
        if (!previewDomain) {
            return 'Something went wrong';
        }

        return (
            <>
                <div className="flex items-center w-full">
                    <h3 className="">
                        Base Domain
                    </h3>
                    {deployment && deployment?.status === DeploymentStatus.COMPLETED && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-green-300">Live</p>
                            <p>•</p>
                            <p>Updated {timeAgo(deployment.updatedAt.toISOString())} ago</p>
                        </div>
                    )}
                    {deployment?.status === DeploymentStatus.FAILED && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-red-500">Error</p>
                        </div>
                    )}
                    {deployment?.status === DeploymentStatus.CANCELLED && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-foreground-secondary">Cancelled</p>
                        </div>
                    )}
                    {isDeploying && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="">Updating • In progress</p>
                        </div>
                    )}
                </div>
                {renderActionSection()}
            </>
        );
    };

    const renderNoDomain = () => {
        return (
            <>
                <div className="flex items-center w-full">
                    <h3 className="">Publish</h3>
                </div>

                <Button disabled={isCreatingDomain} onClick={createBaseDomain} className="w-full rounded-md p-3">
                    {isCreatingDomain ? 'Creating domain...' : 'Publish my site'}
                </Button>
            </>
        );
    };

    const renderActionSection = () => {
        if (!previewDomain?.url) {
            return 'Something went wrong';
        }

        return (
            <div className="w-full flex flex-col gap-2">
                <UrlSection url={previewDomain.url} isCopyable={true} />
                {deployment?.status === DeploymentStatus.FAILED || deployment?.status === DeploymentStatus.CANCELLED ? (
                    <div className="w-full flex flex-col gap-2">
                        {deployment?.error && <p className="text-red-500 max-h-20 overflow-y-auto">{stripAnsi(deployment?.error)}</p>}
                        <Button
                            variant="outline"
                            className="w-full rounded-md p-3"
                            onClick={retry}
                        >
                            Try Updating Again
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={() => publish()}
                        variant="outline"
                        className="w-full rounded-md p-3"
                        disabled={isDeploying || isLoading}
                    >
                        {isLoading && <Icons.LoadingSpinner className="w-4 h-4 mr-2 animate-spin" />}
                        Update
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 flex flex-col items-center gap-2">
            {previewDomain?.url
                ? renderDomain()
                : renderNoDomain()}
        </div>
    );
});
