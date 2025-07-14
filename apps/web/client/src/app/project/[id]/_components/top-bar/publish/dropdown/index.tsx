import { useHostingType } from '@/components/store/hosting';
import { DeploymentType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './advanced-settings';
import { CustomDomainSection } from './custom-domain';
import { LoadingState } from './loading';
import { PreviewDomainSection } from './preview-domain-section';

export const PublishDropdown = observer(() => {
    const { deployment: previewDeployment, isDeploying: isPreviewDeploying } = useHostingType(DeploymentType.PREVIEW);
    const { deployment: customDeployment, isDeploying: isCustomDeploying } = useHostingType(DeploymentType.CUSTOM);

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            {
                isPreviewDeploying ?
                    <LoadingState type="preview" message={previewDeployment?.message ?? 'Deploying...'} progress={previewDeployment?.progress ?? 0} /> :
                    <PreviewDomainSection />
            }
            <Separator />
            {
                isCustomDeploying ?
                    <LoadingState type="custom" message={customDeployment?.message ?? 'Deploying...'} progress={customDeployment?.progress ?? 0} /> :
                    <CustomDomainSection />
            }
            <Separator />
            <AdvancedSettingsSection />
        </div>
    );
});
