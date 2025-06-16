import { Separator } from '@onlook/ui/separator';
import { AdvancedSettingsSection } from './advanced-settings';
import { CustomDomainSection } from './custom-domain-section';
import { PreviewDomainSection } from './preview-domain-section';

export const PublishDropdown = () => {
    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            <PreviewDomainSection />
            <Separator />
            <CustomDomainSection />
            <Separator />
            <AdvancedSettingsSection />
        </div>
    );
};
