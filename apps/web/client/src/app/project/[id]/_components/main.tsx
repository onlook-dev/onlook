'use client';

import { FeedbackModal } from '@/components/ui/feedback-modal';
import { useEditorEngine } from '@/components/store/editor';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { SettingsModalWithProjects } from '@/components/ui/settings-modal/with-project';
import { EditorAttributes } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { usePanelMeasurements } from '../_hooks/use-panel-measure';
import { useStartProject } from '../_hooks/use-start-project';
import { BottomBar } from './bottom-bar';
import { Canvas } from './canvas';
import { EditorBar } from './editor-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from './top-bar';

export const Main = observer(() => {
    const editorEngine = useEditorEngine();
    const router = useRouter();
    const { isProjectReady, error } = useStartProject();
    const leftPanelRef = useRef<HTMLDivElement | null>(null);
    const rightPanelRef = useRef<HTMLDivElement | null>(null);
    const { toolbarLeft, toolbarRight, editorBarAvailableWidth } = usePanelMeasurements(
        leftPanelRef,
        rightPanelRef,
    );

    useEffect(() => {
        function handleGlobalWheel(event: WheelEvent) {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }

            const canvasContainer = document.getElementById(
                EditorAttributes.CANVAS_CONTAINER_ID,
            );
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
            <div className="h-screen w-screen flex items-center justify-center gap-2 flex-col">
                <div className="flex flex-row items-center justify-center gap-2">
                    <Icons.ExclamationTriangle className="h-6 w-6 text-foreground-primary" />
                    <div className="text-xl">Error starting project: {error}</div>
                </div>
                <Button onClick={() => {
                    router.push('/');
                }}>
                    Go to home
                </Button>
            </div>
        );
    }

    if (!isProjectReady) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2">
                <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                <div className="text-xl">Loading project...</div>
            </div>
        );
    }

    if (editorEngine.sandbox.session.isConnecting) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2">
                <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                <div className="text-xl">Connecting to sandbox...</div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="h-screen w-screen flex flex-row select-none relative overflow-hidden">
                <Canvas />

                <div className="absolute top-0 w-full">
                    <TopBar />
                </div>

                {/* Left Panel */}
                <div
                    ref={leftPanelRef}
                    className="absolute top-10 left-0 h-[calc(100%-40px)] z-50"
                >
                    <LeftPanel />
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
                    className="absolute top-10 right-0 h-[calc(100%-40px)] z-50"
                >
                    <RightPanel />
                </div>

                <BottomBar />
            </div>
            <SettingsModalWithProjects />
            <SubscriptionModal />
            <FeedbackModal />
        </TooltipProvider>
    );
});
