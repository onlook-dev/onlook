import { useEditorEngine } from '@/components/Context';
import { EditorMode, LayersPanelTabValue } from '@/lib/models';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
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

export const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();
    const isLocked = editorEngine.isLayersPanelLocked;
    const selectedTab = editorEngine.layersPanelTab;

    const handleMouseEnter = (tab: LayersPanelTabValue) => {
        if (isLocked) {
            return;
        }
        editorEngine.layersPanelTab = tab;
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
                editorEngine.layersPanelTab = null;
            } else {
                // TODO: Since mouse leave won't trigger anymore, we need to listen and check
                //  if the mouse actually left the content panel and then close the content panel
            }
        } else {
            // If we're locked, return to the locked tab when mouse leaves
            editorEngine.layersPanelTab = selectedTab;
        }
    };

    const handleClick = (tab: LayersPanelTabValue) => {
        if (selectedTab === tab && isLocked) {
            editorEngine.isLayersPanelLocked = false;
        } else {
            editorEngine.layersPanelTab = tab;
            editorEngine.isLayersPanelLocked = true;
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
                        selectedTab === LayersPanelTabValue.LAYERS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.LAYERS)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.LAYERS)}
                >
                    <Icons.Layers className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.layers')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === LayersPanelTabValue.PAGES && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.PAGES)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.PAGES)}
                >
                    <Icons.File className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.pages')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === LayersPanelTabValue.IMAGES && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.IMAGES)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.IMAGES)}
                >
                    <Icons.Image className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.images')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === LayersPanelTabValue.WINDOWS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.WINDOWS)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.WINDOWS)}
                >
                    <Icons.Desktop className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.windows.name')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === LayersPanelTabValue.BRAND && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.BRAND)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.BRAND)}
                >
                    <Icons.Brand className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.brand')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 hidden',
                        selectedTab === LayersPanelTabValue.APPS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.APPS)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.APPS)}
                >
                    <Icons.ViewGrid className="w-5 h-5" />
                    <span className="text-xs leading-tight">
                        {t('editor.panels.layers.tabs.apps')}
                    </span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 hidden',
                        selectedTab === LayersPanelTabValue.COMPONENTS && isLocked
                            ? 'bg-accent text-foreground border-[0.5px] border-foreground/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => handleClick(LayersPanelTabValue.COMPONENTS)}
                    onMouseEnter={() => handleMouseEnter(LayersPanelTabValue.COMPONENTS)}
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
            {editorEngine.layersPanelTab && (
                <>
                    <div className="flex-1 w-[280px] bg-background/95 rounded-xl">
                        <div className="border backdrop-blur-xl h-full shadow overflow-auto p-0 rounded-xl">
                            {selectedTab === LayersPanelTabValue.LAYERS && <LayersTab />}
                            {selectedTab === LayersPanelTabValue.COMPONENTS && (
                                <ComponentsTab components={editorEngine.projectInfo.components} />
                            )}
                            {selectedTab === LayersPanelTabValue.PAGES && <PagesTab />}
                            {selectedTab === LayersPanelTabValue.IMAGES && <ImagesTab />}
                            {selectedTab === LayersPanelTabValue.WINDOWS && <WindowsTab />}
                            {selectedTab === LayersPanelTabValue.BRAND && <BrandTab />}
                            {selectedTab === LayersPanelTabValue.APPS && <AppsTab />}
                        </div>
                    </div>

                    {/* Invisible padding area that maintains hover state */}
                    {!isLocked && <div className="w-24 h-full" />}
                </>
            )}
        </div>
    );
});
