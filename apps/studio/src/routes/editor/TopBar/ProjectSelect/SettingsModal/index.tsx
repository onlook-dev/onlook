import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import { DomainTab } from './DomainTab';
import ProjectTab from './ProjectTab';
import EditorTab from './EditorTab';

enum TabValue {
    DOMAIN = 'domain',
    PROJECT = 'project',
    EDITOR = 'editor',
}

export const SettingsModal = ({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const [activeTab, setActiveTab] = useState<TabValue>(TabValue.DOMAIN);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-screen min-h-[600px]">
                <div className="flex flex-col">
                    {/* Top bar */}
                    <div className="flex items-center">
                        <DialogTitle className="text-title3 mb-4">Settings</DialogTitle>
                    </div>
                    <Separator orientation="horizontal" />

                    {/* Main content */}
                    <div className="flex gap-4 h-full overflow-auto">
                        {/* Left navigation */}
                        <div className="w-32 space-y-2 mt-4">
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start px-0 hover:bg-transparent',
                                    activeTab === 'domain'
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setActiveTab(TabValue.DOMAIN)}
                            >
                                <Icons.Globe className="mr-2 h-4 w-4" />
                                Domain
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start px-0 hover:bg-transparent',
                                    activeTab === TabValue.PROJECT
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setActiveTab(TabValue.PROJECT)}
                            >
                                <Icons.Gear className="mr-2 h-4 w-4" />
                                Project
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start px-0 hover:bg-transparent',
                                    activeTab === TabValue.EDITOR
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setActiveTab(TabValue.EDITOR)}
                            >
                                <Icons.Pencil className="mr-2 h-4 w-4" />
                                Editor
                            </Button>
                        </div>
                        <Separator orientation="vertical" />
                        {/* Right content */}
                        <div className="flex-1 overflow-auto p-4">
                            {activeTab === TabValue.DOMAIN && <DomainTab />}
                            {activeTab === TabValue.PROJECT && <ProjectTab />}
                            {activeTab === TabValue.EDITOR && <EditorTab />}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
