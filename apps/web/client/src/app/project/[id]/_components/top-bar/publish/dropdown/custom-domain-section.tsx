import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
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
import stripAnsi from 'strip-ansi';

export const CustomDomainSection = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();

    const { data: subscription } = api.subscription.get.useQuery();
    const { data: domain } = api.domain.custom.get.useQuery({ projectId: editorEngine.projectId });
    const { deployment, publish: runPublish, isDeploying } = useHostingType(DeploymentType.CUSTOM);

    const product = subscription?.product;
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
        if (!domain) {
            console.error(`No custom domain hosting manager found`);
            return;
        }
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

    const renderActionSection = () => {
        if (!domain) {
            return 'Something went wrong';
        }

        return (
            <div className="w-full flex flex-col gap-2">
                <UrlSection url={domain.url} isCopyable={false} />
                {deployment?.status === DeploymentStatus.COMPLETED && (
                    <Button
                        onClick={publish}
                        variant="outline"
                        className={cn(
                            'w-full rounded-md p-3',
                            !domain.publishedAt &&
                            'bg-blue-400 hover:bg-blue-500 text-white',
                        )}
                        disabled={isDeploying}
                    >
                        {domain.publishedAt ? 'Update' : `Publish to ${domain.url}`}
                    </Button>
                )}
                {deployment?.status === DeploymentStatus.FAILED && (
                    <div className="w-full flex flex-col gap-2">
                        <p className="text-red-500 max-h-20 overflow-y-auto">{stripAnsi(deployment?.error)}</p>
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
