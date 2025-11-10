import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

import { LeftPanelTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { BranchesTab } from './branches-tab';
import { BrandTab } from './brand-tab';
import { HelpButton } from './help-button';
import { ImagesTab } from './image-tab';
import { LayersTab } from './layers-tab';
import { PagesTab } from './page-tab';
import { ZoomControls } from './zoom-controls';

const tabs: {
    value: LeftPanelTabValue;
    icon: React.ReactNode;
    label: any;
    disabled?: boolean;
}[] = [
    {
        value: LeftPanelTabValue.LAYERS,
        icon: <Icons.Layers className="h-5 w-5" />,
        label: transKeys.editor.panels.layers.tabs.layers,
    },
    {
        value: LeftPanelTabValue.BRAND,
        icon: <Icons.Brand className="h-5 w-5" />,
        label: transKeys.editor.panels.layers.tabs.brand,
    },
    {
        value: LeftPanelTabValue.PAGES,
        icon: <Icons.File className="h-5 w-5" />,
        label: transKeys.editor.panels.layers.tabs.pages,
    },
    {
        value: LeftPanelTabValue.IMAGES,
        icon: <Icons.Image className="h-5 w-5" />,
        label: transKeys.editor.panels.layers.tabs.images,
    },
    {
        value: LeftPanelTabValue.BRANCHES,
        icon: <Icons.Branch className="h-5 w-5" />,
        label: transKeys.editor.panels.layers.tabs.branches,
    },
];

interface DesignPanelProps {
    onClose?: () => void;
}

export const DesignPanel = observer(({ onClose }: DesignPanelProps) => {
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
        <div className="flex h-full overflow-auto" onMouseLeave={handleMouseLeave}>
            {/* Left sidebar with tabs */}
            <div className="bg-background-onlook/60 flex w-20 flex-col items-center gap-2 py-0.5 backdrop-blur-xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        className={cn(
                            'flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-xl p-2',
                            selectedTab === tab.value && isLocked
                                ? 'bg-accent text-foreground border-foreground/20 border-[0.5px]'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                            tab.disabled &&
                                'hover:text-muted-foreground cursor-not-allowed opacity-50 hover:bg-transparent',
                        )}
                        disabled={tab.disabled}
                        onClick={() => !tab.disabled && handleClick(tab.value)}
                        onMouseEnter={() => !tab.disabled && handleMouseEnter(tab.value)}
                    >
                        {tab.icon}
                        <span className="text-xs leading-tight">{t(tab.label)}</span>
                    </button>
                ))}

                <div className="mt-auto mb-4 flex flex-col items-center gap-0">
                    <ZoomControls />
                    <HelpButton />
                </div>
            </div>

            {/* Content panel */}
            {editorEngine.state.leftPanelTab && (
                <>
                    <div className="bg-background/95 w-[280px] flex-1 rounded-xl">
                        <div className="relative h-full overflow-auto rounded-xl border p-0 shadow backdrop-blur-xl">
                            {onClose && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 z-10 h-6 w-6"
                                    onClick={onClose}
                                >
                                    <Icons.CrossS className="h-4 w-4" />
                                </Button>
                            )}
                            {selectedTab === LeftPanelTabValue.LAYERS && <LayersTab />}
                            {selectedTab === LeftPanelTabValue.BRAND && <BrandTab />}
                            {selectedTab === LeftPanelTabValue.PAGES && <PagesTab />}
                            {selectedTab === LeftPanelTabValue.IMAGES && <ImagesTab />}
                            {selectedTab === LeftPanelTabValue.BRANCHES && <BranchesTab />}
                        </div>
                    </div>

                    {/* Invisible padding area that maintains hover state */}
                    {!isLocked && <div className="h-full w-24" />}
                </>
            )}
        </div>
    );
});
