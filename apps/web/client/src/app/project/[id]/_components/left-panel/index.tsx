import { useEditorEngine } from '@/components/store';
import { EditorMode, LeftPanelTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

// import AppsTab from './AppsTab';
// import BrandTab from './BrandTab';
// import ComponentsTab from './ComponentsTab';
// import { HelpDropdown } from './HelpDropdown';
// import ImagesTab from './ImageTab';
// import LayersTab from './LayersTab';
// import OpenCodeMini from './OpenCodeMini';
// import PagesTab from './PageTab';
// import WindowsTab from './WindowsTab';
// import ZoomControls from './ZoomControls';

const tabs: { value: LeftPanelTabValue; icon: React.ReactNode; label: string; hidden: boolean }[] = [
    {
        value: LeftPanelTabValue.LAYERS,
        icon: <Icons.Layers className="w-5 h-5" />,
        label: 'editor.panels.layers.tabs.layers',
        hidden: false,
    },
    {
        value: LeftPanelTabValue.PAGES,
        icon: <Icons.File className="w-5 h-5" />,
        label: 'editor.panels.layers.tabs.pages',
        hidden: false,
    },
    {
        value: LeftPanelTabValue.IMAGES,
        icon: <Icons.Image className="w-5 h-5" />,
        label: 'editor.panels.layers.tabs.images',
        hidden: false,
    },
    {
        value: LeftPanelTabValue.WINDOWS,
        icon: <Icons.Desktop className="w-5 h-5" />,
        label: 'editor.panels.layers.tabs.windows.name',
        hidden: false,
    },
    {
        value: LeftPanelTabValue.BRAND,
        icon: <Icons.Brand className="w-5 h-5" />,
        label: 'editor.panels.layers.tabs.brand',
        hidden: false,
    },
    {
        value: LeftPanelTabValue.APPS,
        icon: <Icons.ViewGrid className="w-5 h-5" />,
        label: 'editor.panels.layers.tabs.apps',
        hidden: true,
    }
];

export const LeftPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const isLocked = editorEngine.state.leftPanelLocked;
    const selectedTab = editorEngine.state.leftPanelTab;

    const handleMouseEnter = (tab: LeftPanelTabValue) => {
        if (isLocked) {
            return;
        }
        editorEngine.state.leftPanelTab = tab;
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
                editorEngine.state.leftPanelTab = null;
            } else {
                // TODO: Since mouse leave won't trigger anymore, we need to listen and check
                //  if the mouse actually left the content panel and then close the content panel
            }
        } else {
            // If we're locked, return to the locked tab when mouse leaves
            editorEngine.state.leftPanelTab = selectedTab;
        }
    };

    const handleClick = (tab: LeftPanelTabValue) => {
        if (selectedTab === tab && isLocked) {
            editorEngine.state.leftPanelLocked = false;
        } else {
            editorEngine.state.leftPanelTab = tab;
            editorEngine.state.leftPanelLocked = true;
        }
    };


    return (
        <div
            className={cn(
                'flex gap-0 h-full',
                editorEngine.state.editorMode === EditorMode.PREVIEW ? 'hidden' : 'visible',
            )}
            onMouseLeave={handleMouseLeave}
        >
            {/* Left sidebar with tabs */}
            <div className="w-20 bg-background-onlook/60 backdrop-blur-xl flex flex-col items-center py-0.5 gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        className={cn(
                            'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                            tab.hidden && 'hidden',
                            selectedTab === tab.value && isLocked
                                ? 'bg-accent text-foreground border-[0.5px] border-foreground/20 '
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                        )}
                        onClick={() => handleClick(tab.value)}
                        onMouseEnter={() => handleMouseEnter(tab.value)}
                    >
                        {tab.icon}
                        <span className="text-xs leading-tight">
                            {t(tab.label)}
                        </span>
                    </button>
                ))}

                <div className="mt-auto flex flex-col gap-0 items-center mb-4">
                    {/* <OpenCodeMini />
                    <ZoomControls />
                    <HelpDropdown /> */}
                </div>
            </div>

            {/* Content panel */}
            {editorEngine.state.leftPanelTab && (
                <>
                    <div className="flex-1 w-[280px] bg-background/95 rounded-xl">
                        <div className="border backdrop-blur-xl h-full shadow overflow-auto p-0 rounded-xl">
                            {/* {selectedTab === LayersPanelTabValue.LAYERS && <LayersTab />}
                            {selectedTab === LayersPanelTabValue.COMPONENTS && <ComponentsTab components={editorEngine.state.components} />}
                            {selectedTab === LayersPanelTabValue.PAGES && <PagesTab />}
                            {selectedTab === LayersPanelTabValue.IMAGES && <ImagesTab />}
                            {selectedTab === LayersPanelTabValue.WINDOWS && <WindowsTab />}
                            {selectedTab === LayersPanelTabValue.BRAND && <BrandTab />}
                            {selectedTab === LayersPanelTabValue.APPS && <AppsTab />} */}
                        </div>
                    </div>

                    {/* Invisible padding area that maintains hover state */}
                    {!isLocked && <div className="w-24 h-full" />}
                </>
            )}
        </div>
    );
});
