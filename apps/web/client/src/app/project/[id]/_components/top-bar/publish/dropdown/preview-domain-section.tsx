import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { PublishStatus } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { getPublishUrls, timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { UrlSection } from './url';

export const PreviewDomainSection = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { data: domain } = api.domain.preview.get.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: createPreviewDomain } = api.domain.preview.create.useMutation();
    const state = editorEngine.hosting.state;
    const isLoading = state.status === PublishStatus.LOADING;

    if (!project) {
        return 'Something went wrong. Project not found.';
    }

    const createBaseDomain = async (): Promise<void> => {
        const domain = await createPreviewDomain({ projectId: editorEngine.projectId });
        if (!domain) {
            console.error('Failed to create preview domain');
            return;
        }

        publish();
    };

    const publish = async () => {
        if (!domain) {
            console.error(`No preview domain info found`);
            return;
        }
        const res = await editorEngine.hosting.publishPreview(project.id, {
            buildScript: DefaultSettings.COMMANDS.build,
            urls: getPublishUrls(domain.url),
            options: {
                skipBadge: false,
                buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
                skipBuild: false,
            },
        });
        if (!res.success) {
            console.error(res.message);
            toast.error(res.message);
            return;
        }
        toast.success('Deployment successful');
    };

    const retry = () => {
        if (!domain) {
            console.error(`No preview domain info found`);
            return;
        }
        editorEngine.hosting.resetState();
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
                        Base Domain
                    </h3>
                    {state.status === PublishStatus.PUBLISHED && domain.publishedAt && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-green-300">Live</p>
                            <p>•</p>
                            <p>Updated {timeAgo(domain.publishedAt)} ago</p>
                        </div>
                    )}
                    {state.status === PublishStatus.ERROR && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-red-500">Error</p>
                        </div>
                    )}
                    {state.status === PublishStatus.LOADING && (
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

                <Button onClick={createBaseDomain} className="w-full rounded-md p-3">
                    Publish my site
                </Button>
            </>
        );
    };

    const renderActionSection = () => {
        if (!domain) {
            return 'Something went wrong';
        }

        return (
            <div className="w-full flex flex-col gap-2">
                <UrlSection url={domain.url} isCopyable={true} />
                {(state.status === PublishStatus.PUBLISHED ||
                    state.status === PublishStatus.UNPUBLISHED) && (
                        <Button
                            onClick={publish}
                            variant="outline"
                            className="w-full rounded-md p-3"
                            disabled={isLoading}
                        >
                            Update
                        </Button>
                    )}
                {state.status === PublishStatus.ERROR && (
                    <div className="w-full flex flex-col gap-2">
                        <p className="text-red-500 max-h-20 overflow-y-auto">{state.message}</p>
                        <Button
                            variant="outline"
                            className="w-full rounded-md p-3"
                            onClick={retry}
                        >
                            Try Updating Again
                        </Button>
                    </div>
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
