import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { DeploymentStatus, DeploymentType, SettingsTabValue } from '@onlook/models';
import { ProductType } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { UrlSection } from './url';

export const CustomDomainSection = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();

    const { data: subscription } = api.subscription.get.useQuery();
    const { data: domain } = api.domain.custom.get.useQuery({ projectId: editorEngine.projectId });
    const product = subscription?.product;
    const state = editorEngine.hosting.state;
    const isLoading = state.status === DeploymentStatus.LOADING;
    const isPro = product?.type === ProductType.PRO;

    const openCustomDomain = (): void => {
        editorEngine.state.publishOpen = false;
        stateManager.settingsTab = SettingsTabValue.DOMAIN;
        stateManager.isSettingsModalOpen = true;
    };

    const publish = async () => {
        if (!domain) {
            console.error(`No custom domain hosting manager found`);
            return;
        }
        const res = await editorEngine.hosting.publish({
            type: DeploymentType.CUSTOM,
            projectId: editorEngine.projectId,
            buildScript: DefaultSettings.COMMANDS.build,
            buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
            envVars: {},
        });
        toast.success('Deployment successful');
    };

    const retry = () => {
        if (!domain) {
            console.error(`No custom domain hosting manager found`);
            return;
        }
        editorEngine.hosting.resetState();
        publish();
    };

    const renderNoDomain = () => {
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

        if (!isPro) {
            return renderNoDomain();
        }

        return (
            <>
                <div className="flex items-center w-full">
                    <h3 className="">
                        Custom Domain
                    </h3>
                    {state.status === DeploymentStatus.PUBLISHED && domain.publishedAt && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-green-300">Live</p>
                            <p>•</p>
                            <p>Updated {timeAgo(domain.publishedAt)} ago</p>
                        </div>
                    )}
                    {state.status === DeploymentStatus.ERROR && (
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-red-500">Error</p>
                        </div>
                    )}
                    {state.status === DeploymentStatus.LOADING && (
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
                <UrlSection url={domain.url} isCopyable={false} />
                {(state.status === DeploymentStatus.PUBLISHED ||
                    state.status === DeploymentStatus.UNPUBLISHED) && (
                        <Button
                            onClick={publish}
                            variant="outline"
                            className={cn(
                                'w-full rounded-md p-3',
                                !domain.publishedAt &&
                                'bg-blue-400 hover:bg-blue-500 text-white',
                            )}
                            disabled={isLoading}
                        >
                            {domain.publishedAt ? 'Update' : `Publish to ${domain.url}`}
                        </Button>
                    )}
                {state.status === DeploymentStatus.ERROR && (
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
