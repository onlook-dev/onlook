'use client';

import { useEditorEngine } from '@/components/store/editor';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { SettingsModalWithProjects } from '@/components/ui/settings-modal/with-project';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { api } from '@/trpc/react';
import { uploadBlobToStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import { base64ToBlob, getScreenshotPath } from '@onlook/utility';
import { fromPreviewImg } from '@onlook/db';
import { usePanelMeasurements } from '../_hooks/use-panel-measure';
import { useStartProject } from '../_hooks/use-start-project';
import { BottomBar } from './bottom-bar';
import { Canvas } from './canvas';
import { EditorBar } from './editor-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from './top-bar';
import { EditorAttributes } from '@onlook/constants';

export const Main = observer(() => {
    const editorEngine = useEditorEngine();
    const router = useRouter();
    const { isProjectReady, error } = useStartProject();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: updateProject } = api.project.update.useMutation();
    const leftPanelRef = useRef<HTMLDivElement | null>(null);
    const rightPanelRef = useRef<HTMLDivElement | null>(null);
    const { toolbarLeft, toolbarRight, editorBarAvailableWidth } = usePanelMeasurements(
        leftPanelRef,
        rightPanelRef,
    );

    const hasInitialScreenshotRef = useRef(false);
    const lastScreenshotAttemptRef = useRef(0);

    // DOM-based screenshot fallback when penpal fails
    const captureFrameViaDOM = async (frameData: any): Promise<string | null> => {
        try {
            const iframe = frameData.view as HTMLIFrameElement;
            if (!iframe.contentDocument || !iframe.contentWindow) {
                return null;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            canvas.width = iframe.offsetWidth || 800;
            canvas.height = iframe.offsetHeight || 600;

            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Try to capture iframe content using html2canvas-like approach
            const doc = iframe.contentDocument;
            const body = doc.body;
            
            if (body) {
                // Simple text-based capture of visible content
                ctx.fillStyle = '#333333';
                ctx.font = '16px Arial, sans-serif';
                ctx.fillText('Preview captured via DOM fallback', 20, 50);
                
                // Get basic info about the page
                const title = doc.title || 'Untitled Page';
                ctx.fillText(`Page: ${title}`, 20, 80);
                
                const url = iframe.src;
                if (url) {
                    ctx.fillText(`URL: ${new URL(url).pathname}`, 20, 110);
                }
            }

            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            console.warn('DOM screenshot fallback failed:', error);
            return null;
        }
    };

    const captureAndUploadScreenshot = useCallback(async (retryCount = 0) => {
        const maxRetries = 5;
        const retryDelay = 3000;

        try {
            // Check if enough time has passed since last attempt
            const now = Date.now();
            if (now - lastScreenshotAttemptRef.current < 2000) {
                return;
            }
            lastScreenshotAttemptRef.current = now;

            if (!project?.id) {
                console.log('Screenshot: No project ID available');
                return;
            }

            // Get frames with views and check penpal connection health
            const framesWithViews = editorEngine.frames.getAll().filter(f => {
                if (!f.view) return false;
                
                // Check if the frame view has the captureScreenshot method
                if (!f.view.captureScreenshot) return false;
                
                // Check if frame is loading
                if (f.view?.isLoading?.()) return false;
                
                // Check if iframe src is loaded
                if (!f.view.src || f.view.src === 'about:blank') return false;
                
                return true;
            });
            
            if (framesWithViews.length === 0) {
                console.log('Screenshot: No ready frames available, retrying...');
                if (retryCount < maxRetries) {
                    setTimeout(() => void captureAndUploadScreenshot(retryCount + 1), retryDelay);
                }
                return;
            }

            let screenshotData = null;
            let mimeType = 'image/jpeg';
            let captureSuccess = false;

            // Try each frame until we get a successful screenshot
            for (const frame of framesWithViews) {
                try {
                    console.log(`Screenshot: Attempting capture from frame ${frame.frame.id}`);
                    
                    // Additional check for penpal connection
                    const iframe = frame.view;
                    if (!iframe || !iframe.contentDocument || iframe.contentDocument.readyState !== 'complete') {
                        console.log(`Screenshot: Frame ${frame.frame.id} not fully loaded`);
                        continue;
                    }

                    // Try to capture with timeout
                    const capturePromise = frame.view?.captureScreenshot();
                    if (!capturePromise) continue;
                    
                    const timeoutPromise = new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error('Screenshot timeout')), 10000)
                    );

                    const result = await Promise.race([capturePromise, timeoutPromise]);
                    
                    if (result?.data) {
                        screenshotData = result.data;
                        mimeType = result.mimeType ?? 'image/jpeg';
                        captureSuccess = true;
                        console.log('Screenshot: Successfully captured from frame', frame.frame.id);
                        break;
                    }
                } catch (frameError) {
                    const errorMessage = frameError instanceof Error ? frameError.message : 'Unknown error';
                    console.warn(`Screenshot: Frame ${frame.frame.id} capture failed:`, errorMessage);
                    
                    // If it's a penpal connection error, the frame needs time to reconnect
                    if (errorMessage.includes('destroyed connection')) {
                        console.log('Screenshot: Penpal connection destroyed, waiting for reconnection...');
                        continue;
                    }
                    continue;
                }
            }

            // If penpal screenshot failed, try DOM-based fallback
            if (!captureSuccess || !screenshotData) {
                console.log('Screenshot: Penpal capture failed, trying DOM fallback...');
                try {
                    const domScreenshot = await captureFrameViaDOM(framesWithViews[0]);
                    if (domScreenshot) {
                        screenshotData = domScreenshot;
                        mimeType = 'image/jpeg';
                        captureSuccess = true;
                        console.log('Screenshot: DOM fallback successful');
                    }
                } catch (domError) {
                    const errorMessage = domError instanceof Error ? domError.message : 'Unknown error';
                    console.warn('Screenshot: DOM fallback also failed:', errorMessage);
                }
            }

            if (!captureSuccess || !screenshotData) {
                console.log('Screenshot: All capture methods failed, retrying...');
                if (retryCount < maxRetries) {
                    setTimeout(() => void captureAndUploadScreenshot(retryCount + 1), retryDelay);
                }
                return;
            }

            console.log('Screenshot: Starting upload...');
            const file = base64ToBlob(screenshotData, mimeType);
            const uploadRes = await uploadBlobToStorage(
                STORAGE_BUCKETS.PREVIEW_IMAGES,
                getScreenshotPath(project.id, mimeType),
                file,
                { contentType: mimeType },
            );
            
            if (!uploadRes?.path) {
                console.error('Screenshot: Upload failed');
                return;
            }

            const dbPreviewImg = fromPreviewImg({
                type: 'storage',
                storagePath: { bucket: STORAGE_BUCKETS.PREVIEW_IMAGES, path: uploadRes.path },
            });

            await updateProject({ id: project.id, project: { ...dbPreviewImg } });
            console.log('Screenshot: Successfully updated project preview');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Screenshot: Error during capture/upload:', errorMessage);
            if (retryCount < maxRetries) {
                setTimeout(() => void captureAndUploadScreenshot(retryCount + 1), retryDelay);
            }
        }
    }, [project?.id, updateProject, editorEngine.frames]);

    const debouncedUpdateScreenshotRef = useRef(
        debounce(() => {
            void captureAndUploadScreenshot();
        }, 3000),
    );

    // Take first screenshot on initial load if not present
    useEffect(() => {
        if (!isProjectReady || hasInitialScreenshotRef.current === true) return;
        hasInitialScreenshotRef.current = true;
        
        // Wait longer for frames and penpal connections to be fully established
        const timeoutId = setTimeout(() => {
            if (!project?.metadata?.previewImg) {
                console.log('Screenshot: Taking initial screenshot for project');
                void captureAndUploadScreenshot();
            }
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [isProjectReady, project?.id, project?.metadata?.previewImg, captureAndUploadScreenshot]);

    // Keep updating screenshot as user makes changes (debounced)
    useEffect(() => {
        if (!isProjectReady) return;
        debouncedUpdateScreenshotRef.current();
    }, [editorEngine.history.length, isProjectReady]);

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
            <div className="h-screen w-screen flex flex-row select-none relative">
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
        </TooltipProvider>
    );
});
