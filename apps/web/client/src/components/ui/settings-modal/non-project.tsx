import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { capitalizeFirstLetter } from '@onlook/utility';

import type { SettingTab } from './helpers';
import { useStateManager } from '@/components/store/state';
import { SettingsTabValue } from './helpers';
import { PreferencesTab } from './preferences-tab';
import { SubscriptionTab } from './subscription-tab';

export const NonProjectSettingsModal = observer(() => {
    const stateManager = useStateManager();

    const tabs: SettingTab[] = [
        {
            label: SettingsTabValue.PREFERENCES,
            icon: <Icons.Person className="mr-2 h-4 w-4" />,
            component: <PreferencesTab />,
        },
        {
            label: SettingsTabValue.SUBSCRIPTION,
            icon: <Icons.CreditCard className="mr-2 h-4 w-4" />,
            component: <SubscriptionTab />,
        },
    ];

    return (
        <AnimatePresence>
            {stateManager.isSettingsModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-background/80 fixed inset-0 z-50 backdrop-blur-sm"
                        onClick={() => (stateManager.isSettingsModalOpen = false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
                    >
                        <div className="bg-background pointer-events-auto h-[700px] max-h-screen w-[900px] max-w-4xl rounded-lg border p-0 shadow-lg">
                            <div className="flex h-full flex-col overflow-hidden">
                                {/* Top bar - fixed height */}
                                <div className="ml-1 flex shrink-0 items-center p-5 pb-4 select-none">
                                    <h1 className="text-title3">Settings</h1>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto"
                                        onClick={() => (stateManager.isSettingsModalOpen = false)}
                                    >
                                        <Icons.CrossS className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Separator orientation="horizontal" className="shrink-0" />

                                {/* Main content */}
                                <div className="flex min-h-0 flex-1 overflow-hidden">
                                    {/* Left navigation - fixed width */}
                                    <div className="flex flex-col overflow-y-scroll select-none">
                                        <div className="text-regularPlus w-48 shrink-0 space-y-1 p-5">
                                            <p className="text-muted-foreground text-smallPlus mt-2 mb-2 ml-2.5">
                                                Global Settings
                                            </p>
                                            {tabs.map((tab) => (
                                                <Button
                                                    key={tab.label}
                                                    variant="ghost"
                                                    className={cn(
                                                        'w-full justify-start px-0 hover:bg-transparent',
                                                        stateManager.settingsTab === tab.label
                                                            ? 'text-foreground-active'
                                                            : 'text-muted-foreground',
                                                    )}
                                                    onClick={() =>
                                                        (stateManager.settingsTab = tab.label)
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
                                                (tab) => tab.label === stateManager.settingsTab,
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
