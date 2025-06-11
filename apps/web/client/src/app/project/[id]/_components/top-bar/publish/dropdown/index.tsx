import { DomainType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { DomainSection } from './domain-section';

export const PublishDropdown = () => {
    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            <DomainSection type={DomainType.PREVIEW} />
            <Separator />
            {/* <DomainSection
                domain={customDomain}
                type={DomainType.CUSTOM}
            />
            <Separator />
            <AdvancedSettingsSection /> */}
        </div>
    );
};
