import { useEditorEngine } from '@/components/store/editor';
import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { DefaultSettings } from '@onlook/constants';
import { PublishStatus } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Progress } from '@onlook/ui/progress';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { UrlSection } from './url';

export const PreviewDomainSection = observer(() => {
    const editorEngine = useEditorEngine();
    const domainsManager = useDomainsManager();
    const projectManager = useProjectManager();
    const project = projectManager.project;
    const [progress, setProgress] = useState(0);
    const state = editorEngine.hosting.state;
    const isLoading = state.status === PublishStatus.LOADING;
    const domain = domainsManager.domains.preview;
    const progressInterval = useRef<Timer | null>(null);

    useEffect(() => {
        if (state.status === PublishStatus.LOADING) {
            setProgress(0);
            progressInterval.current = setInterval(() => {
                setProgress((prev) => Math.min(prev + 0.167, 100));
            }, 100);
        } else {
            setProgress(0);
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        }

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [state.status]);

    if (!project) {
        return 'Something went wrong. Project not found.';
    }

    const createBaseDomain = async (): Promise<void> => {
        const domain = await domainsManager.createPreviewDomain();
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
        const res = await editorEngine.hosting.publish(project.id, {
            buildScript: DefaultSettings.COMMANDS.build,
            urls: [domain.url],
            options: {
                skipBadge: false,
                buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
                envVars: project.env || {},
            },
        });
        console.log(res);
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
                {state.status === PublishStatus.LOADING && (
                    <div className="w-full flex flex-col gap-2 py-1">
                        <p>{state.message}</p>
                        <Progress value={progress} className="w-full" />
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
