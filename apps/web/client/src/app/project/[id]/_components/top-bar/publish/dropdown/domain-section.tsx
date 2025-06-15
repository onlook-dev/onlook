import { useEditorEngine } from '@/components/store/editor';
import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { useUserManager } from '@/components/store/user';
import { DefaultSettings } from '@onlook/constants';
import { DomainType, PublishStatus, SettingsTabValue } from '@onlook/models';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import { Progress } from '@onlook/ui/progress';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { UrlSection } from './url';

export const DomainSection = observer(({ type }: { type: DomainType }) => {
    const editorEngine = useEditorEngine();
    const domainsManager = useDomainsManager();
    const userManager = useUserManager();
    const projectManager = useProjectManager();
    const project = projectManager.project;

    const [progress, setProgress] = useState(0);
    const plan = userManager.subscription.plan;
    const state = editorEngine.hosting.state;
    const isLoading = state.status === PublishStatus.LOADING;

    const domain = type === DomainType.PREVIEW
        ? domainsManager.domains.preview
        : domainsManager.domains.custom;

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

    const openCustomDomain = (): void => {
        editorEngine.state.publishOpen = false;
        editorEngine.state.settingsTab = SettingsTabValue.DOMAIN;
        editorEngine.state.settingsOpen = true;
    };

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
            console.error(`No ${type} domain hosting manager found`);
            return;
        }
        const res = await editorEngine.hosting.publish(project.id, {
            buildScript: DefaultSettings.COMMANDS.build,
            urls: [domain.url],
            options: {
                skipBadge: type === DomainType.CUSTOM,
                buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
                envVars: project.env || {},
            },
        });
        console.log(res);
    };

    const retry = () => {
        if (!domain) {
            console.error(`No ${type} domain hosting manager found`);
            return;
        }
        editorEngine.hosting.resetState();
        publish();
    };

    const renderNoDomainBase = () => {
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

    const renderNoDomainCustom = () => {
        return (
            <>
                <div className="flex items-center w-full">
                    <h3 className="">Custom Domain</h3>
                    <span className="ml-auto rounded-full bg-blue-400 text-white px-1.5 py-0.5 text-xs">
                        PRO
                    </span>
                </div>

                <Button
                    onClick={openCustomDomain}
                    className="w-full rounded-md p-3 bg-blue-600 border-blue border hover:bg-blue-700 text-white"
                >
                    Link a Custom Domain
                </Button>
            </>
        );
    };

    const renderDomain = () => {
        if (!domain) {
            return 'Something went wrong';
        }

        // If the domain is custom, check if the user has a PRO plan
        if (type === DomainType.CUSTOM) {
            if (plan !== UsagePlanType.PRO) {
                return renderNoDomainCustom();
            }
        }

        return (
            <>
                <div className="flex items-center w-full">
                    <h3 className="">
                        {type === DomainType.PREVIEW ?
                            (domain.url ? 'Base Domain' : 'Publish')
                            : 'Custom Domain'}
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

    const renderActionSection = () => {
        if (!domain) {
            return 'Something went wrong';
        }

        return (
            <div className="w-full flex flex-col gap-2">
                <UrlSection url={domain.url} isCopyable={domain.type === DomainType.PREVIEW} />
                {(state.status === PublishStatus.PUBLISHED ||
                    state.status === PublishStatus.UNPUBLISHED) && (
                        <Button
                            onClick={publish}
                            variant="outline"
                            className={cn(
                                'w-full rounded-md p-3',
                                domain.type === DomainType.CUSTOM &&
                                !domain.publishedAt &&
                                'bg-blue-400 hover:bg-blue-500 text-white',
                            )}
                            disabled={isLoading}
                        >
                            {domain.type === DomainType.PREVIEW && 'Update'}
                            {domain.type === DomainType.CUSTOM &&
                                (domain.publishedAt ? 'Update' : `Publish to ${domain.url}`)}
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
                : type === DomainType.PREVIEW
                    ? renderNoDomainBase()
                    : renderNoDomainCustom()}
        </div>
    );
});
