import { observer } from 'mobx-react-lite';

import { DeploymentType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';

import { useHostingType } from '@/components/store/hosting';
import { AdvancedSettingsSection } from './advanced-settings';
import { CustomDomainSection } from './custom-domain';
import { LoadingState } from './loading';
import { PreviewDomainSection } from './preview-domain-section';

export const PublishDropdown = observer(() => {
    const { isDeploying: isPreviewDeploying } = useHostingType(DeploymentType.PREVIEW);
    const { isDeploying: isCustomDeploying } = useHostingType(DeploymentType.CUSTOM);

    return (
        <div className="text-foreground-secondary flex flex-col rounded-md">
            {isPreviewDeploying ? (
                <LoadingState type={DeploymentType.PREVIEW} />
            ) : (
                <PreviewDomainSection />
            )}
            <Separator />
            {isCustomDeploying ? (
                <LoadingState type={DeploymentType.CUSTOM} />
            ) : (
                <CustomDomainSection />
            )}
            <Separator />
            <AdvancedSettingsSection />
        </div>
    );
});
