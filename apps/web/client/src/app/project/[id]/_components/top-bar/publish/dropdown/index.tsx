import { useHostingType } from '@/components/store/hosting';
import { DeploymentType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './advanced-settings';
import { CustomDomainSection } from './custom-domain';
import { LoadingState } from './loading';
import { PreviewDomainSection } from './preview-domain-section';

export const PublishDropdown = observer(() => {
    const { isDeploying: isPreviewDeploying } = useHostingType(DeploymentType.PREVIEW);
    const { isDeploying: isCustomDeploying } = useHostingType(DeploymentType.CUSTOM);

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            {
                isPreviewDeploying ?
                    <LoadingState type={DeploymentType.PREVIEW} /> :
                    <PreviewDomainSection />
            }
            <Separator />
            {
                isCustomDeploying ?
                    <LoadingState type={DeploymentType.CUSTOM} /> :
                    <CustomDomainSection />
            }
            <Separator />
            <AdvancedSettingsSection />
        </div>
    );
});
