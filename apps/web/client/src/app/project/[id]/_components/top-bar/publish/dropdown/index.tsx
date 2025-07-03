import { useHostingType } from '@/components/store/hosting';
import { DeploymentType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './advanced-settings';
import { CustomDomainSection } from './custom-domain-section';
import { LoadingState } from './loading';
import { PreviewDomainSection } from './preview-domain-section';

export const PublishDropdown = observer(() => {
    const { deployment: previewDeployment, isDeploying: isPreviewDeploying } = useHostingType(DeploymentType.PREVIEW);
    const { deployment: customDeployment, isDeploying: isCustomDeploying } = useHostingType(DeploymentType.CUSTOM);

    const isDeploying = isPreviewDeploying || isCustomDeploying;
    const deployment = previewDeployment || customDeployment;

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            {isDeploying ? (
                <LoadingState message={deployment?.message ?? 'Deploying...'} progress={deployment?.progress ?? 0} />
            ) : (
                <>
                    <PreviewDomainSection />
                    <Separator />
                    <CustomDomainSection />
                    <Separator />
                    <AdvancedSettingsSection />
                </>
            )}
        </div>
    );
});
