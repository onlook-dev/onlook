import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { capitalizeFirstLetter } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { ComingSoonTab, SettingsTabValue, type SettingTab } from './helpers';

export const ProjectSettingsTabs = observer(({ appendTabs }: { appendTabs: (tabs: SettingTab[]) => void }) => {
    const editorEngine = useEditorEngine();
    const tabs: SettingTab[] = [
        {
            label: SettingsTabValue.SITE,
            icon: <Icons.File className="mr-2 h-4 w-4" />,
            component: <ComingSoonTab />,
        },
        {
            label: SettingsTabValue.DOMAIN,
            icon: <Icons.Globe className="mr-2 h-4 w-4" />,
            component: <ComingSoonTab />,
        },
        {
            label: SettingsTabValue.PROJECT,
            icon: <Icons.Gear className="mr-2 h-4 w-4" />,
            component: <ComingSoonTab />,
        },
        {
            label: SettingsTabValue.VERSIONS,
            icon: <Icons.Code className="mr-2 h-4 w-4" />,
            component: <ComingSoonTab />,
        },
    ];

    useEffect(() => {
        appendTabs(tabs);
    }, []);

    return (
        <>
            {tabs.map((tab) => (
                <Button
                    key={tab.label}
                    variant="ghost"
                    className={cn(
                        'w-full justify-start px-0 hover:bg-transparent',
                        editorEngine.state.settingsTab === tab.label
                            ? 'text-foreground-active'
                            : 'text-muted-foreground',
                    )}
                    onClick={() =>
                        (editorEngine.state.settingsTab = tab.label)
                    }
                >
                    {tab.icon}
                    {capitalizeFirstLetter(tab.label.toLowerCase())}
                </Button>
            ))}
        </>
    )
});
