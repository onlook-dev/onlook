import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { SettingsTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

export const AdvancedSettingsSection = () => {
    const stateManager = useStateManager();
    const editorEngine = useEditorEngine();

    const openAdvancedSettings = () => {
        editorEngine.state.publishOpen = false;
        stateManager.settingsTab = SettingsTabValue.DOMAIN;
        stateManager.isSettingsModalOpen = true;
    };

    return (
        <Button
            variant="ghost"
            className="group flex flex-row items-center gap-2 py-4 rounded-t-none h-12 hover:rounded-none active:rounded-none"
            onClick={openAdvancedSettings}
        >
            <Icons.Gear className="h-4 w-4" />
            <span className="group-hover:underline group-active:underline">Advanced Settings</span>
        </Button>
    );
};
