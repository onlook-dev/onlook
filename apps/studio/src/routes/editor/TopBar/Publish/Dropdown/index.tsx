import { useEditorEngine } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { BaseDomainSection } from './Base';
import { CustomDomainSection } from './Custom';

export const PublishDropdown = observer(
    ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
        return (
            <div className="rounded-md flex flex-col p-4 text-foreground-secondary gap-2">
                <BaseDomainSection />
                <Separator />
                <CustomDomainSection />
                <Separator />
                <AdvancedSettingsSection setIsOpen={setIsOpen} />
            </div>
        );
    },
);

export const AdvancedSettingsSection = ({
    setIsOpen,
}: {
    setIsOpen: (isOpen: boolean) => void;
}) => {
    const editorEngine = useEditorEngine();

    const openAdvancedSettings = () => {
        setIsOpen(false);
        editorEngine.settingsTab = SettingsTabValue.DOMAIN;
        editorEngine.isSettingsOpen = true;
    };

    return (
        <Button
            variant="ghost"
            className="flex flex-row items-center gap-2"
            onClick={openAdvancedSettings}
        >
            <Icons.Gear className="h-4 w-4" />
            Advanced Settings
            <Icons.ChevronRight className="ml-auto h-4 w-4" />
        </Button>
    );
};
