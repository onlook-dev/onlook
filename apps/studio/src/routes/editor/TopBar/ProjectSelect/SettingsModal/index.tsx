import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import { DomainTab } from './Domain';
import EditorTab from './EditorTab';
import ProjectTab from './ProjectTab';

enum TabValue {
    DOMAIN = 'domain',
    PROJECT = 'project',
    EDITOR = 'editor',
}

export const SettingsModal = ({
    isOpen,
    setOpen,
}: {
    isOpen: boolean;
    setOpen: (open: boolean) => void;
}) => {
    const [activeTab, setActiveTab] = useState<TabValue>(TabValue.DOMAIN);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Top bar - fixed height */}
            <div className="shrink-0 flex items-center p-6 pb-4">
                <h1 className="text-title3">Settings</h1>
            </div>
            <Separator orientation="horizontal" className="shrink-0" />

            {/* Main content */}
            <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
                {/* Left navigation - fixed width */}
                <div className="shrink-0 w-32 space-y-2 p-6 text-regularPlus">
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
                <Separator orientation="vertical" className="h-full" />
                {/* Right content */}
                <div className="flex-1 min-w-0 overflow-y-auto p-6 pl-4">
                    {activeTab === TabValue.DOMAIN && (
                        <DomainTab isOpen={isOpen} setOpen={setOpen} />
                    )}
                    {activeTab === TabValue.PROJECT && <ProjectTab />}
                    {activeTab === TabValue.EDITOR && <EditorTab />}
                </div>
            </div>
        </div>
    );
};
