import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import type { PageNode } from '@onlook/models';
import { SettingsTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { capitalizeFirstLetter } from '@onlook/utility';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { DomainTab } from './domain';
import { SiteTab } from './site';
import { VersionsTab } from './versions';
import { PreferencesTab } from './preferences';
import { ProjectTab } from './project';
import { PageTab } from './site/page';

interface SettingTab {
    label: SettingsTabValue | string;
    icon: React.ReactNode;
    component: React.ReactNode;
}

export const SettingsModal = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectManager();
    const project = projectsManager.project;
    const pagesManager = editorEngine.pages;

    useEffect(() => {
        if (editorEngine.state.settingsOpen && project) {
            pagesManager.scanPages();
            editorEngine.image.scanImages();
        }
    }, [editorEngine.state.settingsOpen]);

    const flattenPages = useMemo(() => {
        return pagesManager.tree.reduce((acc, page) => {
            const flattenNode = (node: typeof page) => {
                if (node.children?.length) {
                    node.children.forEach((child) => flattenNode(child));
                } else {
                    acc.push(node);
                }
            };
            flattenNode(page);
            return acc;
        }, [] as PageNode[]);
    }, [pagesManager.tree]);

    const projectOnlyTabs: SettingTab[] = [
        {
            label: SettingsTabValue.SITE,
            icon: <Icons.File className="mr-2 h-4 w-4" />,
            component: <SiteTab metadata={flattenPages.find((page) => page.path === '/')?.metadata ?? {}} />,
        },
        {
            label: SettingsTabValue.DOMAIN,
            icon: <Icons.Globe className="mr-2 h-4 w-4" />,
            component: <DomainTab />,
        },
        {
            label: SettingsTabValue.PROJECT,
            icon: <Icons.Gear className="mr-2 h-4 w-4" />,
            component: <ProjectTab />,
        },
        {
            label: SettingsTabValue.VERSIONS,
            icon: <Icons.Code className="mr-2 h-4 w-4" />,
            component: <VersionsTab />,
        },
    ];

    const globalTabs: SettingTab[] = [
        {
            label: SettingsTabValue.PREFERENCES,
            icon: <Icons.Person className="mr-2 h-4 w-4" />,
            component: <PreferencesTab />,
        }
    ];

    const pagesTabs: SettingTab[] = flattenPages.map((page) => ({
        label: page.path === '/' ? 'Home' : page.path,
        icon: <Icons.File className="mr-2 h-4 min-w-4" />,
        component: <PageTab metadata={page.metadata} path={page.path} />,
    }));

    const tabs = project ? [...projectOnlyTabs, ...globalTabs, ...pagesTabs] : [...globalTabs];    
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
                                        <div className="shrink-0 w-48 space-y-2 p-6 text-regularPlus">
                                            <p className="text-muted-foreground text-smallPlus">
                                                Project
                                            </p>
                                            {projectOnlyTabs.map((tab) => (
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
                                        <Separator />
                                        <div className="shrink-0 w-48 space-y-2 p-6 text-regularPlus">
                                            <p className="text-muted-foreground text-smallPlus">
                                                Page Settings
                                            </p>
                                            {pagesTabs.map((tab) => (
                                                <Button
                                                    key={tab.label}
                                                    variant="ghost"
                                                    className={cn(
                                                        'w-full justify-start px-0 hover:bg-transparent',
                                                        'truncate',
                                                        editorEngine.state.settingsTab === tab.label
                                                            ? 'text-foreground-active'
                                                            : 'text-muted-foreground',
                                                    )}
                                                    onClick={() =>
                                                        (editorEngine.state.settingsTab = tab.label)
                                                    }
                                                >
                                                    {tab.icon}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="truncate">
                                                                {capitalizeFirstLetter(
                                                                    tab.label.toLowerCase(),
                                                                )}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {capitalizeFirstLetter(
                                                                tab.label.toLowerCase(),
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Button>
                                            ))}
                                        </div>
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
                                                (tab) =>
                                                    tab.label === editorEngine.state.settingsTab,
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