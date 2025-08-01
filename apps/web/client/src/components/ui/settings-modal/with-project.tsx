import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { cn } from '@onlook/ui/utils';
import { capitalizeFirstLetter } from '@onlook/utility';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import DomainTab from './domain';
import { SettingsTabValue, type SettingTab } from './helpers';
import { PreferencesTab } from './preferences-tab';
import { ProjectTab } from './project';
import { SiteTab } from './site';
import { VersionsTab } from './versions';
import { PageTab } from './site/page';
import type { PageNode } from '@onlook/models';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

function TruncatedLabelWithTooltip({ label }: { label: string }) {
    const [isTruncated, setIsTruncated] = useState(false);
    const spanRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = spanRef.current;
        if (el) {
            setIsTruncated(el.scrollWidth > el.clientWidth);
        }
    }, [label]);
    return isTruncated ? (
        <Tooltip>
            <TooltipTrigger asChild>
                <span ref={spanRef} className="truncate">
                    {label}
                </span>
            </TooltipTrigger>
            <TooltipContent side='right'>
                {label}
            </TooltipContent>
        </Tooltip>
    ) : (
        <span ref={spanRef} className="truncate">{label}</span>
    );
}

export const SettingsModalWithProjects = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const pagesManager = editorEngine.pages;

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

    const globalTabs: SettingTab[] = [
        {
            label: SettingsTabValue.PREFERENCES,
            icon: <Icons.Person className="mr-2 h-4 w-4" />,
            component: <PreferencesTab />,
        },
    ];

    const projectTabs: SettingTab[] = [
        {
            label: SettingsTabValue.SITE,
            icon: <Icons.File className="mr-2 h-4 w-4" />,
            component: <SiteTab />,
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

    const pagesTabs: SettingTab[] = flattenPages
        .filter((page) => page.path !== '/')
        .map((page) => ({
            label: page.path,
            icon: <Icons.File className="mr-2 h-4 min-w-4" />,
            component: <PageTab metadata={page.metadata} path={page.path} />,
        }));

    const tabs = [...globalTabs, ...pagesTabs, ...projectTabs];

    useEffect(() => {
        if (stateManager.isSettingsModalOpen) {
            editorEngine.pages.scanPages();
            editorEngine.image.scanImages();
        }
    }, [stateManager.isSettingsModalOpen]);

    return (
        <AnimatePresence>
            {stateManager.isSettingsModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (stateManager.isSettingsModalOpen = false)}
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
                                <div className="shrink-0 flex items-center p-5 pb-4 ml-1 select-none">
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
                                <div className="flex flex-1 min-h-0 overflow-hidden">
                                    {/* Left navigation - fixed width */}
                                    <div className="flex flex-col overflow-y-scroll select-none">
                                        <div className="shrink-0 w-48 space-y-1 p-5 text-regularPlus">
                                            <p className="text-muted-foreground text-smallPlus ml-2.5 mt-2 mb-2">
                                                Project
                                            </p>
                                            {projectTabs.map((tab) => (
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
                                        <Separator />
                                        {pagesTabs.length > 0 && (
                                            <>
                                                <div className="shrink-0 w-48 space-y-1 p-5 text-regularPlus">
                                                    <p className="text-muted-foreground text-smallPlus ml-2.5 mt-2 mb-2">
                                                        Pages Settings
                                                    </p>
                                                    {pagesTabs.map((tab) => (
                                                        <Button
                                                            key={tab.label}
                                                            variant="ghost"
                                                            className={cn(
                                                                'w-full justify-start px-0 hover:bg-transparent',
                                                                'truncate',
                                                                stateManager.settingsTab ===
                                                                    tab.label
                                                                    ? 'text-foreground-active'
                                                                    : 'text-muted-foreground',
                                                            )}
                                                            onClick={() =>
                                                                (stateManager.settingsTab =
                                                                    tab.label)
                                                            }
                                                        >
                                                            {tab.icon}
                                                            <TruncatedLabelWithTooltip label={capitalizeFirstLetter(tab.label.toLowerCase())} />
                                                        </Button>
                                                    ))}
                                                </div>
                                                <Separator />
                                            </>
                                        )}
                                        <div className="shrink-0 w-48 space-y-1 p-5 text-regularPlus">
                                            <p className="text-muted-foreground text-smallPlus ml-2.5 mt-2 mb-2">
                                                Global Settings
                                            </p>
                                            {globalTabs.map((tab) => (
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
