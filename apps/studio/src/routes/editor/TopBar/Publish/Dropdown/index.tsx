import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './AdvancedSettings';
import { BaseDomainSection } from './Base';
import { CustomDomainSection } from './Custom';

export const PublishDropdown = observer(
    ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
        return (
            <div className="rounded-md flex flex-col text-foreground-secondary">
                <BaseDomainSection />
                <Separator />
                <CustomDomainSection setIsOpen={setIsOpen} />
                <Separator />
                <AdvancedSettingsSection setIsOpen={setIsOpen} />
            </div>
        );
    },
);
