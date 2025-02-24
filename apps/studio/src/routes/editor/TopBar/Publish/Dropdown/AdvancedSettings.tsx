import { useEditorEngine } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

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
            className="flex flex-row items-center gap-2 py-4 rounded-t-none h-12"
            onClick={openAdvancedSettings}
        >
            <Icons.Gear className="h-4 w-4" />
            Advanced Settings
            <Icons.ChevronRight className="ml-auto h-3 w-3" />
        </Button>
    );
};
