import { useDomainsManager } from '@/components/store/project';
import { PublishStatus } from '@onlook/models/hosting';
import { DomainType } from '@onlook/models';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './advanced-settings';
import { DomainSection } from './domain';

export const PublishDropdown = observer(() => {
    const domainsManager = useDomainsManager();
    if (!domainsManager.project) {
        return null;
    }

    const baseDomain = domainsManager.project?.domains?.base || null;
    const customDomain = domainsManager.project?.domains?.custom || null;

    const baseDomainState = domainsManager.state || {
        status: PublishStatus.UNPUBLISHED,
        message: null,
    };
    const customDomainState = domainsManager.state || {
        status: PublishStatus.UNPUBLISHED,
        message: null,
    };

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            <DomainSection domain={baseDomain} type={DomainType.BASE} state={baseDomainState} />
            <Separator />
            <DomainSection
                domain={customDomain}
                type={DomainType.CUSTOM}
                state={customDomainState}
            />
            <Separator />
            <AdvancedSettingsSection />
        </div>
    );
});
