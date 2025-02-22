import type { DomainSettings } from '@onlook/models/projects';
import { DomainType } from '@onlook/models/projects';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './AdvancedSettings';
import { DomainSection } from './Domain';

export interface PublishState {
    status: 'loading' | 'error' | 'success';
    message: string | null;
    error: string | null;
}

export const PublishDropdown = observer(
    ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
        const baseDomain: DomainSettings = {
            url: '123456.onlook.live',
            type: DomainType.BASE,
            publishedAt: new Date().toISOString(),
        };

        const customDomain: DomainSettings = {
            url: 'onlook.com',
            type: DomainType.CUSTOM,
            publishedAt: new Date().toISOString(),
        };

        const state: PublishState = {
            status: 'error',
            message: 'Publishing your site...',
            error: 'A very long error message that is not very descriptive. It is a very long error message that is not very descriptive. It is a very long error message that is not very descriptive. A very long error message that is not very descriptive. It is a very long error message that is not very descriptive. It is a very long error message that is not very descriptive. A very long error message that is not very descriptive. It is a very long error message that is not very descriptive. It is a very long error message that is not very descriptive. A very long error message that is not very descriptive. It is a very long error message that is not very descriptive. It is a very long error message that is not very descriptive.',
        };

        return (
            <div className="rounded-md flex flex-col text-foreground-secondary">
                <DomainSection
                    setIsOpen={setIsOpen}
                    domain={baseDomain}
                    type={DomainType.BASE}
                    state={state}
                />
                <Separator />
                <DomainSection
                    setIsOpen={setIsOpen}
                    domain={customDomain}
                    type={DomainType.CUSTOM}
                    state={state}
                />
                <Separator />
                <AdvancedSettingsSection setIsOpen={setIsOpen} />
            </div>
        );
    },
);
