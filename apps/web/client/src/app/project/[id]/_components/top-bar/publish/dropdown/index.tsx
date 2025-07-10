import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
import { api } from '@/trpc/react';
import { DeploymentType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './advanced-settings';
import { CustomDomainSection } from './custom-domain-section';
import { LoadingState } from './loading';
import { PreviewDomainSection } from './preview-domain-section';
import { Button } from '@onlook/ui/button';

export const PublishDropdown = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: previewDomain } = api.domain.preview.get.useQuery({ projectId: editorEngine.projectId });
    const { deployment: previewDeployment, isDeploying: isPreviewDeploying } = useHostingType(DeploymentType.PREVIEW);
    const { deployment: customDeployment, isDeploying: isCustomDeploying } = useHostingType(DeploymentType.CUSTOM);

    const isDeploying = isPreviewDeploying || isCustomDeploying;
    const deployment = previewDeployment || customDeployment;
    const hasPublishedSite = !!previewDomain?.url;

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            {isDeploying ? (
                <LoadingState message={deployment?.message ?? 'Deploying...'} progress={deployment?.progress ?? 0} />
            ) : (
                <>
                    <PreviewDomainSection />
                    {hasPublishedSite && (
                        <>
                            <Separator />
                            <CustomDomainSection />
                        </>
                    )}
                    <Separator />
                    <div className="flex flex-row items-center justify-between px-4 pb-2 pt-2 gap-2">
                        <AdvancedSettingsSection />
                        {hasPublishedSite && (
                            <Button
                                variant="outline"
                                className="rounded-md p-3 ml-2"
                                disabled
                            >
                                View Site
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});
