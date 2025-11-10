'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { observer } from 'mobx-react-lite';

import { EditorAttributes } from '@onlook/constants';
import { EditorMode, LeftPanelTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { SettingsModalWithProjects } from '@/components/ui/settings-modal/with-project';
import { usePanelMeasurements } from '../_hooks/use-panel-measure';
import { useStartProject } from '../_hooks/use-start-project';
import { BottomBar } from './bottom-bar';
import { Canvas } from './canvas';
import { EditorBar } from './editor-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from './top-bar';

export const Main = observer(() => {
    const router = useRouter();
    const editorEngine = useEditorEngine();
    const { isProjectReady, error } = useStartProject();
    const leftPanelRef = useRef<HTMLDivElement | null>(null);
    const rightPanelRef = useRef<HTMLDivElement | null>(null);
    const { toolbarLeft, toolbarRight, editorBarAvailableWidth } = usePanelMeasurements(
        leftPanelRef,
        rightPanelRef,
    );

    const handleSidebarClick = (tab: LeftPanelTabValue) => {
        editorEngine.state.leftPanelTab = tab;
        editorEngine.state.leftPanelLocked = true;
    };

    const handleClosePanel = () => {
        editorEngine.state.leftPanelTab = null;
        editorEngine.state.leftPanelLocked = false;
    };

    useEffect(() => {
        function handleGlobalWheel(event: WheelEvent) {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }

            const canvasContainer = document.getElementById(EditorAttributes.CANVAS_CONTAINER_ID);
            if (canvasContainer?.contains(event.target as Node | null)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
        }

        window.addEventListener('wheel', handleGlobalWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleGlobalWheel);
        };
    }, []);

    if (error) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-2">
                <div className="flex flex-row items-center justify-center gap-2">
                    <Icons.ExclamationTriangle className="text-foreground-primary h-6 w-6" />
                    <div className="text-xl">Error starting project: {error}</div>
                </div>
                <Button
                    onClick={() => {
                        router.push('/');
                    }}
                >
                    Go to home
                </Button>
            </div>
        );
    }

    if (!isProjectReady) {
        return (
            <div className="flex h-screen w-screen items-center justify-center gap-2">
                <Icons.LoadingSpinner className="text-foreground-primary h-6 w-6 animate-spin" />
                <div className="text-xl">Loading project...</div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="relative flex h-screen w-screen flex-row overflow-hidden select-none">
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div className="flex-1">
                            <Canvas />
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-background/95 w-64 backdrop-blur-lg">
                        <ContextMenuItem disabled>
                            <Icons.Plus className="mr-2 h-4 w-4" />
                            <span>Add Element</span>
                        </ContextMenuItem>
                        <ContextMenuItem disabled>
                            <Icons.ComponentInstance className="mr-2 h-4 w-4" />
                            <span>Add Component</span>
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <Icons.ViewGrid className="mr-2 h-4 w-4" />
                                <span>Panels</span>
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-48">
                                <ContextMenuItem
                                    onClick={() => handleSidebarClick(LeftPanelTabValue.LAYERS)}
                                >
                                    <span>Layers</span>
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={() => handleSidebarClick(LeftPanelTabValue.BRAND)}
                                >
                                    <span>Brand</span>
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={() => handleSidebarClick(LeftPanelTabValue.PAGES)}
                                >
                                    <span>Pages</span>
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={() => handleSidebarClick(LeftPanelTabValue.IMAGES)}
                                >
                                    <span>Images</span>
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                    onClick={() => handleSidebarClick(LeftPanelTabValue.BRANCHES)}
                                >
                                    <span>Branches</span>
                                </ContextMenuItem>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => void editorEngine.copy.copy()}>
                            <Icons.Clipboard className="mr-2 h-4 w-4" />
                            <span>Copy</span>
                            <span className="text-muted-foreground ml-auto text-xs">⌘ C</span>
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => void editorEngine.copy.paste()}>
                            <Icons.ClipboardCopy className="mr-2 h-4 w-4" />
                            <span>Paste</span>
                            <span className="text-muted-foreground ml-auto text-xs">⌘ V</span>
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                <div className="absolute top-0 w-full">
                    <TopBar />
                </div>

                {/* Left Panel */}
                <div ref={leftPanelRef} className="absolute top-10 left-2 z-50 h-[calc(100%-40px)]">
                    <LeftPanel onClose={handleClosePanel} />
                </div>
                {/* EditorBar anchored between panels */}
                <div
                    className="absolute top-10 z-49"
                    style={{
                        left: toolbarLeft,
                        right: toolbarRight,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        maxWidth: editorBarAvailableWidth,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                    }}
                >
                    <div style={{ pointerEvents: 'auto' }}>
                        <EditorBar availableWidth={editorBarAvailableWidth} />
                    </div>
                </div>

                {/* Right Panel */}
                <div
                    ref={rightPanelRef}
                    className={cn(
                        'absolute top-10 right-0 z-50 h-[calc(100%-40px)]',
                        editorEngine.state.editorMode === EditorMode.PREVIEW && 'hidden',
                    )}
                >
                    <RightPanel />
                </div>

                <BottomBar />
            </div>
            <SettingsModalWithProjects />
            <SubscriptionModal />
        </TooltipProvider>
    );
});
