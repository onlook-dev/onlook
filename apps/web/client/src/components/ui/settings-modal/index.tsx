import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { capitalizeFirstLetter } from '@onlook/utility';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { ComingSoonTab, SettingsTabValue, type SettingTab } from './helpers';
import { ProjectSettingsTabs } from './with-project';

export const SettingsModal = observer(({ showProjectTabs = false }: { showProjectTabs: boolean }) => {
    const editorEngine = useEditorEngine();
    const pagesManager = editorEngine.pages;

    const globalTabs: SettingTab[] = [
        {
            label: SettingsTabValue.PREFERENCES,
            icon: <Icons.Person className="mr-2 h-4 w-4" />,
            component: <ComingSoonTab />,
        },
        {
            label: SettingsTabValue.ADVANCED,
            icon: <Icons.MixerVertical className="mr-2 h-4 w-4" />,
            component: <ComingSoonTab />,
        },
    ]

    const [tabs, setTabs] = useState<SettingTab[]>(globalTabs);

    useEffect(() => {
        if (editorEngine.state.settingsOpen) {
            pagesManager.scanPages();
            editorEngine.image.scanImages();
        }
    }, [editorEngine.state.settingsOpen]);

    const appendProjectTabs = (projectTabs: SettingTab[]) => {
        setTabs([...tabs, ...projectTabs]);
    }

    return (
        <AnimatePresence>
            {editorEngine.state.settingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (editorEngine.state.settingsOpen = false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-background border rounded-lg shadow-lg max-w-4xl max-h-screen h-[700px] w-[900px] p-0 pointer-events-auto">
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Top bar - fixed height */}
                                <div className="shrink-0 flex items-center p-6 pb-4">
                                    <h1 className="text-title3">Settings</h1>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto"
                                        onClick={() => (editorEngine.state.settingsOpen = false)}
                                    >
                                        <Icons.CrossS className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Separator orientation="horizontal" className="shrink-0" />

                                {/* Main content */}
                                <div className="flex flex-1 min-h-0 overflow-hidden">
                                    {/* Left navigation - fixed width */}
                                    <div className="flex flex-col overflow-y-scroll">
                                        {showProjectTabs && <div className="shrink-0 w-48 space-y-2 p-6 text-regularPlus">
                                            <p className="text-muted-foreground text-smallPlus">
                                                Project
                                            </p>
                                            <ProjectSettingsTabs appendTabs={appendProjectTabs} />
                                        </div>}
                                        <Separator />
                                        <div className="shrink-0 w-48 space-y-2 p-6 text-regularPlus">
                                            <p className="text-muted-foreground text-smallPlus">
                                                Global Settings
                                            </p>
                                            {globalTabs.map((tab) => (
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
                                        </div>
                                    </div>
                                    <Separator orientation="vertical" className="h-full" />
                                    {/* Right content */}
                                    <div className="flex-1 overflow-y-auto">
                                        {
                                            tabs.find(
                                                (tab) => tab.label === editorEngine.state.settingsTab,
                                            )?.component
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
