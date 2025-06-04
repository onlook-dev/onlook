import { useEditorEngine } from '@/components/store/editor';
import { SettingsTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

export const AdvancedSettingsSection = () => {
    const editorEngine = useEditorEngine();

    const openAdvancedSettings = () => {
        editorEngine.state.publishOpen = false;
        editorEngine.state.settingsTab = SettingsTabValue.DOMAIN;
        editorEngine.state.settingsOpen = true;
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
