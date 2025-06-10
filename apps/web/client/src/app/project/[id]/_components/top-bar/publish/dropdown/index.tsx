import { DomainType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { PreviewDomainSection } from './preview-domain';

export const PublishDropdown = () => {
    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            <PreviewDomainSection type={DomainType.PREVIEW} />
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
