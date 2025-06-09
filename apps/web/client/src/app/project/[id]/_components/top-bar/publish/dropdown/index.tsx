import { useDomainsManager } from '@/components/store/project';
import { DomainType } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { DomainSection } from './domain';

export const PublishDropdown = observer(() => {
    const domainsManager = useDomainsManager();
    if (!domainsManager.project) {
        return null;
    }

    const baseDomain = domainsManager.project?.domains?.base || null;
    const customDomain = domainsManager.project?.domains?.custom || null;

    return (
        <div className="rounded-md flex flex-col text-foreground-secondary">
            <DomainSection domain={baseDomain} type={DomainType.BASE} />
            {/* <Separator />
            <DomainSection
                domain={customDomain}
                type={DomainType.CUSTOM}
            />
            <Separator />
            <AdvancedSettingsSection /> */}
        </div>
    );
});
