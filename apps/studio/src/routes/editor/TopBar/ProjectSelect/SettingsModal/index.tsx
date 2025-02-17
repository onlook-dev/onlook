import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { useState, useEffect } from 'react';
import { DomainTab } from './DomainTab';
import ProjectTab from './ProjectTab';
import EditorTab from './PreferencesTab';
import PreferencesTab from './PreferencesTab';

export enum TabValue {
    DOMAIN = 'domain',
    PROJECT = 'project',
    PREFERENCES = 'preferences',
}

export const SettingsModal = ({
    open,
    onOpenChange,
    activeTab = TabValue.DOMAIN,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeTab?: TabValue;
}) => {
    const [selectedTab, setSelectedTab] = useState<TabValue>(activeTab);

    useEffect(() => {
        setSelectedTab(activeTab);
    }, [activeTab]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[600px] p-0">
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Top bar - fixed height */}
                    <div className="shrink-0 flex items-center p-6 pb-4">
                        <DialogTitle className="text-title3">Settings</DialogTitle>
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
                                    selectedTab === 'domain'
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setSelectedTab(TabValue.DOMAIN)}
                            >
                                <Icons.Globe className="mr-2 h-4 w-4" />
                                Domain
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start px-0 hover:bg-transparent',
                                    selectedTab === TabValue.PROJECT
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setSelectedTab(TabValue.PROJECT)}
                            >
                                <Icons.Gear className="mr-2 h-4 w-4" />
                                Project
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start px-0 hover:bg-transparent',
                                    selectedTab === TabValue.PREFERENCES
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setSelectedTab(TabValue.PREFERENCES)}
                            >
                                <Icons.Person className="mr-2 h-4 w-4" />
                                Preferences
                            </Button>
                        </div>
                        <Separator orientation="vertical" className="h-full" />
                        {/* Right content */}
                        <div className="flex-1 min-w-0 overflow-y-auto p-6 pl-4">
                            {selectedTab === TabValue.DOMAIN && <DomainTab />}
                            {selectedTab === TabValue.PROJECT && <ProjectTab />}
                            {selectedTab === TabValue.PREFERENCES && <PreferencesTab />}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
