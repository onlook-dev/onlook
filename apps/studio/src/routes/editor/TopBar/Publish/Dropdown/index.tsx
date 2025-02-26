import { useProjectsManager } from '@/components/Context';
import { PublishStatus } from '@onlook/models/hosting';
import { DomainType } from '@onlook/models/projects';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { AdvancedSettingsSection } from './AdvancedSettings';
import { DomainSection } from './Domain';

export const PublishDropdown = observer(
    ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
        const projectsManager = useProjectsManager();
        if (!projectsManager.project) {
            return null;
        }

        const baseDomain = projectsManager.project?.domains?.base || null;
        const customDomain = projectsManager.project?.domains?.custom || null;

        const baseDomainState = projectsManager.domains?.base?.state || {
            status: PublishStatus.UNPUBLISHED,
            message: null,
        };
        const customDomainState = projectsManager.domains?.custom?.state || {
            status: PublishStatus.UNPUBLISHED,
            message: null,
        };

        return (
            <div className="rounded-md flex flex-col text-foreground-secondary">
                <DomainSection
                    setIsOpen={setIsOpen}
                    domain={baseDomain}
                    type={DomainType.BASE}
                    state={baseDomainState}
                />

                {/* TODO: Uncomment after freestyle bug is fixed */}
                {/* <Separator />
                <DomainSection
                    setIsOpen={setIsOpen}
                    domain={customDomain}
                    type={DomainType.CUSTOM}
                    state={customDomainState}
                /> */}
                <Separator />
                <AdvancedSettingsSection setIsOpen={setIsOpen} />
            </div>
        );
    },
);
