import { useEditorEngine } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { DomainTab } from './Domain';
import PreferencesTab from './PreferencesTab';
import ProjectTab from './ProjectTab';

const SettingsModal = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <AnimatePresence>
            {editorEngine.isSettingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (editorEngine.isSettingsOpen = false)}
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
                                        onClick={() => (editorEngine.isSettingsOpen = false)}
                                    >
                                        <Icons.CrossS className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Separator orientation="horizontal" className="shrink-0" />

                                {/* Main content */}
                                <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
                                    {/* Left navigation - fixed width */}
                                    <div className="shrink-0 w-40 space-y-2 p-6 text-regularPlus">
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                'w-full justify-start px-0 hover:bg-transparent',
                                                editorEngine.settingsTab === SettingsTabValue.DOMAIN
                                                    ? 'text-foreground-active'
                                                    : 'text-muted-foreground',
                                            )}
                                            onClick={() =>
                                                (editorEngine.settingsTab = SettingsTabValue.DOMAIN)
                                            }
                                        >
                                            <Icons.Globe className="mr-2 h-4 w-4" />
                                            Domain
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                'w-full justify-start px-0 hover:bg-transparent',
                                                editorEngine.settingsTab ===
                                                    SettingsTabValue.PROJECT
                                                    ? 'text-foreground-active'
                                                    : 'text-muted-foreground',
                                            )}
                                            onClick={() =>
                                                (editorEngine.settingsTab =
                                                    SettingsTabValue.PROJECT)
                                            }
                                        >
                                            <Icons.Gear className="mr-2 h-4 w-4" />
                                            Project
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                'w-full justify-start px-0 hover:bg-transparent',
                                                editorEngine.settingsTab ===
                                                    SettingsTabValue.PREFERENCES
                                                    ? 'text-foreground-active'
                                                    : 'text-muted-foreground',
                                            )}
                                            onClick={() =>
                                                (editorEngine.settingsTab =
                                                    SettingsTabValue.PREFERENCES)
                                            }
                                        >
                                            <Icons.Person className="mr-2 h-4 w-4" />
                                            Preferences
                                        </Button>
                                    </div>
                                    <Separator orientation="vertical" className="h-full" />
                                    {/* Right content */}
                                    <div className="flex-1 min-w-0 overflow-y-auto p-6 pl-4">
                                        {editorEngine.settingsTab === SettingsTabValue.DOMAIN && (
                                            <DomainTab />
                                        )}
                                        {editorEngine.settingsTab === SettingsTabValue.PROJECT && (
                                            <ProjectTab />
                                        )}
                                        {editorEngine.settingsTab ===
                                            SettingsTabValue.PREFERENCES && <PreferencesTab />}
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

export default SettingsModal;
