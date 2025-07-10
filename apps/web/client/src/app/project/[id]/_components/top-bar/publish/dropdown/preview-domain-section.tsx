import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { DeploymentStatus, DeploymentType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { UrlSection } from './url';
import stripAnsi from 'strip-ansi';
import { Icons } from '@onlook/ui/icons';

export const PreviewDomainSection = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { data: domain, refetch: refetchDomain } = api.domain.preview.get.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: createPreviewDomain, isPending: isCreatingDomain } = api.domain.preview.create.useMutation();
    const { deployment, publish: runPublish, isDeploying } = useHostingType(DeploymentType.PREVIEW);

    // DEMO: Always show the error UI for non-domain publishing errors
    const demoNonDomainError = true; // Set to true to always show error for demo

    const createBaseDomain = async (): Promise<void> => {
        const previewDomain = await createPreviewDomain({ projectId: editorEngine.projectId });
        if (!previewDomain) {
            console.error('Failed to create preview domain');
            toast.error('Failed to create preview domain');
            return;
        }
        await refetchDomain();
        publish();
    };

    const publish = async (): Promise<void> => {
        if (!project) {
            console.error('No project found');
            toast.error('No project found');
            return;
        }

        const res = await runPublish({
            projectId: editorEngine.projectId,
            buildScript: DefaultSettings.COMMANDS.build,
            buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
            envVars: {},
        });

        if (!res) {
            toast.error('Failed to create deployment');
            return;
        }
        toast.success('Created Deployment', {
            description: 'Deployment ID: ' + res.deploymentId,
        });
    };

    const retry = () => {
        if (!domain?.url) {
            console.error(`No preview domain info found`);
            return;
        }
        // editorEngine.hosting.resetState();
        publish();
    };

    const renderDomain = () => {
        if (!domain) {
            return 'Something went wrong';
        }

        return (
            <>
                <div className="flex items-center w-full">
                    <h3 className="">
                       Publish
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
                            <span className="text-red-500">Error</span>
                            <span className="text-foreground-secondary">• Try again or fix with AI Chat</span>
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
                
                <p className="text-sm text-muted-foreground text-center mt-2">
                    Publish now, add your custom domain next.
                </p>
            </>
        );
    };

    const renderActionSection = () => {
        if (!domain?.url) {
            console.warn('No domain URL found:', domain);
            return 'Something went wrong';
        }

        console.log('Domain URL being passed to UrlSection:', domain.url);

        return (
            <div className="w-full flex flex-col gap-2">
                <UrlSection url={domain.url} isCopyable={true} />
                {demoNonDomainError ? (
                    <div className="w-full flex flex-col gap-2">
                        <p className="text-red-500 max-h-20 overflow-y-auto">
                            {stripAnsi(deployment?.error) || 'The site failed to update – Error Code 432 The site failed to update – Error Code 432 update – Error Code 432update – Error Code 432 Error Code 432 Error Code 432 Error Cod...'}
                        </p>
                        <div className="flex flex-row w-full gap-2">
                            <div className="flex-1">
                                <Button
                                    variant="outline"
                                    className="w-full rounded-md p-3"
                                    onClick={retry}
                                >
                                    Try Updating Again
                                </Button>
                            </div>
                            <div className="flex-1">
                                <Button
                                    variant="outline"
                                    className="w-full rounded-md p-3 border-amber-400 text-amber-400 hover:bg-amber-400/10 flex items-center justify-center gap-2"
                                    // onClick for Fix with AI will be added later
                                >
                                    <Icons.MagicWand className="h-4 w-4 mr-2" />
                                    Fix with AI Chat
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={() => publish()}
                        variant="outline"
                        className="w-full rounded-md p-3"
                        disabled={isDeploying}
                    >
                        Update
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 flex flex-col items-center gap-2">
            {domain?.url
                ? renderDomain()
                : renderNoDomain()}
        </div>
    );
});
