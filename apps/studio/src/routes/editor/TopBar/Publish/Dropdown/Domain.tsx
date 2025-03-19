import { useEditorEngine, useProjectsManager, useUserManager } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { PublishStatus, type PublishState } from '@onlook/models/hosting';
import { DomainType, type DomainSettings } from '@onlook/models/projects';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import { Progress } from '@onlook/ui/progress';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { UrlSection } from './Url';

export const DomainSection = observer(
    ({
        domain,
        type,
        state,
    }: {
        domain: DomainSettings | null;
        type: DomainType;
        state: PublishState;
    }) => {
        const editorEngine = useEditorEngine();
        const projectsManager = useProjectsManager();
        const userManager = useUserManager();

        const [progress, setProgress] = useState(0);
        const plan = userManager.subscription.plan;
        const isAnyDomainLoading =
            projectsManager.domains?.base?.state.status === PublishStatus.LOADING ||
            projectsManager.domains?.custom?.state.status === PublishStatus.LOADING;

        useEffect(() => {
            let progressInterval: Timer | null = null;

            if (state.status === PublishStatus.LOADING) {
                setProgress(0);
                progressInterval = setInterval(() => {
                    setProgress((prev) => Math.min(prev + 0.167, 100));
                }, 100);
            } else {
                setProgress(0);
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
            }

            return () => {
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
            };
        }, [state.status]);

        const openCustomDomain = () => {
            editorEngine.isPublishOpen = false;
            editorEngine.settingsTab = SettingsTabValue.DOMAIN;
            editorEngine.isSettingsOpen = true;
        };

        const createBaseDomain = () => {
            if (!projectsManager.domains) {
                console.error('No domains manager found');
                return;
            }
            projectsManager.domains.addBaseDomainToProject(
                userManager.settings.settings?.editor?.buildFlags,
            );
        };

        const publish = () => {
            const domainManager =
                type === DomainType.BASE
                    ? projectsManager.domains?.base
                    : projectsManager.domains?.custom;
            if (!domainManager) {
                console.error(`No ${type} domain hosting manager found`);
                return;
            }
            domainManager.publish({
                skipBadge: type === DomainType.CUSTOM || plan === UsagePlanType.PRO,
                buildFlags: userManager.settings.settings?.editor?.buildFlags,
            });
        };

        const retry = () => {
            const domainManager =
                type === DomainType.BASE
                    ? projectsManager.domains?.base
                    : projectsManager.domains?.custom;
            if (!domainManager) {
                console.error(`No ${type} domain hosting manager found`);
                return;
            }
            domainManager.refresh();
        };

        const renderNoDomainBase = () => {
            return (
                <>
                    <div className="flex items-center w-full">
                        <h3 className="">Base Domain</h3>
                    </div>

                    <Button onClick={createBaseDomain} className="w-full rounded-md p-3">
                        Publish preview site
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
                        className="w-full rounded-md p-3 bg-blue-400 hover:bg-blue-500 text-white"
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
                            {type === DomainType.BASE ? 'Base Domain' : 'Custom Domain'}
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
                    <UrlSection url={domain.url} />
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
                            disabled={isAnyDomainLoading}
                        >
                            {domain.type === DomainType.BASE && 'Update'}
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
                {domain
                    ? renderDomain()
                    : type === DomainType.BASE
                      ? renderNoDomainBase()
                      : renderNoDomainCustom()}
            </div>
        );
    },
);
