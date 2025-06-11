import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import { useDomainsManager } from '@/components/store/project';
import { PublishStatus, type PublishState, DomainType, type DomainSettings, SettingsTabValue } from '@onlook/models';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import { ProgressWithInterval } from '@onlook/ui/progress-with-interval';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { DefaultSettings } from '@onlook/constants';
import { UrlSection } from './url';
import { toJS } from 'mobx';

export const DomainSection = observer(
    ({
        domain,
        type
    }: {
        domain: DomainSettings | null;
        type: DomainType;
        }) => {
        const editorEngine = useEditorEngine();
        const domainsManager = useDomainsManager();
        const userManager = useUserManager();

        const plan = userManager.subscription.plan;
        const state = domainsManager.state;
        const isAnyDomainLoading =
            state.status === PublishStatus.LOADING;

        const openCustomDomain = () => {
            editorEngine.state.publishOpen = false;
            editorEngine.state.settingsTab = SettingsTabValue.DOMAIN;
            editorEngine.state.settingsOpen = true;
        };

        const createBaseDomain = () => {
            if (!domainsManager.project) {
                console.error('No domains manager found');
                return;
            }
            domainsManager.addBaseDomainToProject(
                DefaultSettings.EDITOR_SETTINGS.buildFlags,
            );
        };

        const publish = () => {
            const domainManager =
                type === DomainType.BASE
                    ? domainsManager.project?.domains?.base
                    : domainsManager.project?.domains?.custom;
            if (!domainManager) {
                console.error(`No ${type} domain hosting manager found`);
                return;
            }
            domainsManager.publish({
                skipBadge: type === DomainType.CUSTOM,
                buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
                envVars: domainsManager.project?.env || {},
            }, type);
        };

        const retry = () => {
            const domainManager =
                type === DomainType.BASE
                    ? domainsManager.project?.domains?.base
                    : domainsManager.project?.domains?.custom;
            if (!domainManager) {
                console.error(`No ${type} domain hosting manager found`);
                return;
            }
            domainsManager.refresh();
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
                            {type === DomainType.BASE ?
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
                    <UrlSection url={domain.url} isCopyable={domain.type === DomainType.BASE} />
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
                            <ProgressWithInterval isLoading={state.status === PublishStatus.LOADING} />
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="p-4 flex flex-col items-center gap-2">
                {domain?.url
                    ? renderDomain()
                    : type === DomainType.BASE
                      ? renderNoDomainBase()
                      : renderNoDomainCustom()}
            </div>
        );
    },
);
