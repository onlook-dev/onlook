import { SettingsTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';

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
            className="flex h-12 flex-row items-center gap-2 rounded-t-none py-4"
            onClick={openAdvancedSettings}
        >
            <Icons.Gear className="h-4 w-4" />
            Advanced Settings
            <Icons.ChevronRight className="ml-auto h-3 w-3" />
        </Button>
    );
};
