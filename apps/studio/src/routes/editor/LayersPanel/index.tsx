import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppsTab from './AppsTab';
import BrandTab from './BrandTab';
import ComponentsTab from './ComponentsTab';
import { HelpDropdown } from './HelpDropdown';
import ImagesTab from './ImageTab';
import LayersTab from './LayersTab';
import OpenCodeMini from './OpenCodeMini';
import PagesTab from './PageTab';
import WindowsTab from './WindowsTab';
import ZoomControls from './ZoomControls';

const COMPONENT_DISCOVERY_ENABLED = false;

export const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();

    enum TabValue {
        PAGES = 'pages',
        LAYERS = 'layers',
        COMPONENTS = 'components',
        IMAGES = 'images',
        WINDOWS = 'windows',
        BRAND = 'brand',
        APPS = 'apps',
    }
    const [selectedTab, setSelectedTab] = useState<TabValue>(TabValue.LAYERS);
    const [isContentPanelOpen, setIsContentPanelOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const handleMouseEnter = (tab: TabValue) => {
        if (isLocked) {
            return;
        }
        setSelectedTab(tab);
        setIsContentPanelOpen(true);
    };

    const isMouseInContentPanel = (e: React.MouseEvent<HTMLDivElement>): boolean => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const contentPanel = e.currentTarget;
        if (contentPanel) {
            const { left, right, top, bottom } = contentPanel.getBoundingClientRect();
            if (mouseX < left || mouseX > right || mouseY < top || mouseY > bottom) {
                return false;
            }
        }
        return true;
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isLocked) {
            // This is to handle things like dropdown where the mouse is still in the content panel
            if (!isMouseInContentPanel(e)) {
                setIsContentPanelOpen(false);
            } else {
                // TODO: Since mouse leave won't trigger anymore, we need to listen and check
                //  if the mouse actually left the content panel and then close the content panel
            }
        } else {
            // If we're locked, return to the locked tab when mouse leaves
            setSelectedTab(selectedTab);
        }
    };

    const handleClick = (tab: TabValue) => {
        if (selectedTab === tab && isLocked) {
            setIsLocked(false);
            setIsContentPanelOpen(false);
        } else {
            setSelectedTab(tab);
            setIsContentPanelOpen(true);
            setIsLocked(true);
        }
    };

    return (
        <div
            className={cn(
                'flex gap-0 h-[calc(100vh-5rem)] ',
                editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : 'visible',
            )}
            onMouseLeave={handleMouseLeave}
        >
            {/* Left sidebar with tabs */}
            <div className="w-20 bg-background-onlook/60 backdrop-blur-xl flex flex-col items-center py-0.5 gap-2">
                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.LAYERS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(TabValue.LAYERS)}
                    onMouseEnter={() => handleMouseEnter(TabValue.LAYERS)}
                >
                    <Icons.Layers className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.layers')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.PAGES && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(TabValue.PAGES)}
                    onMouseEnter={() => handleMouseEnter(TabValue.PAGES)}
                >
                    <Icons.File className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.pages')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.IMAGES && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(TabValue.IMAGES)}
                    onMouseEnter={() => handleMouseEnter(TabValue.IMAGES)}
                >
                    <Icons.Image className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.images')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.WINDOWS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(TabValue.WINDOWS)}
                    onMouseEnter={() => handleMouseEnter(TabValue.WINDOWS)}
                >
                    <Icons.Desktop className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.windows.name')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.BRAND && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => handleClick(TabValue.BRAND)}
                    onMouseEnter={() => handleMouseEnter(TabValue.BRAND)}
                >
                    <Icons.Brand className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.brand')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 hidden',
                        selectedTab === TabValue.APPS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(TabValue.APPS)}
                    onMouseEnter={() => handleMouseEnter(TabValue.APPS)}
                >
                    <Icons.ViewGrid className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.apps')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 hidden',
                        selectedTab === TabValue.COMPONENTS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => handleClick(TabValue.COMPONENTS)}
                    onMouseEnter={() => handleMouseEnter(TabValue.COMPONENTS)}
                >
                    <Icons.Component className="w-5 h-5" />
                    <span className="text-xs leading-tight">Elements</span>
                </button>

                <div className="mt-auto flex flex-col gap-0 items-center mb-4">
                    <OpenCodeMini />
                    <ZoomControls />
                    <HelpDropdown />
                </div>
            </div>

            {/* Content panel */}
            {isContentPanelOpen && (
                <>
                    <div
                        className="flex-1 w-[280px] bg-background/95 rounded-xl"
                        onMouseEnter={() => setIsContentPanelOpen(true)}
                    >
                        <div className="border backdrop-blur-xl h-full shadow overflow-auto p-0 rounded-xl">
                            {selectedTab === TabValue.LAYERS && <LayersTab />}
                            {selectedTab === TabValue.COMPONENTS &&
                                (COMPONENT_DISCOVERY_ENABLED ? (
                                    <ComponentsTab
                                        components={editorEngine.projectInfo.components}
                                    />
                                ) : (
                                    <div className="w-[260px] pt-96 text-center opacity-70">
                                        Coming soon
                                    </div>
                                ))}
                            {selectedTab === TabValue.PAGES && <PagesTab />}
                            {selectedTab === TabValue.IMAGES && <ImagesTab />}
                            {selectedTab === TabValue.WINDOWS && <WindowsTab />}
                            {selectedTab === TabValue.BRAND && <BrandTab />}
                            {selectedTab === TabValue.APPS && <AppsTab />}
                        </div>
                    </div>

                    {/* Invisible padding area that maintains hover state */}
                    {!isLocked && (
                        <div
                            className="w-24 h-full"
                            onMouseEnter={() => setIsContentPanelOpen(true)}
                        />
                    )}
                </>
            )}
        </div>
    );
});
