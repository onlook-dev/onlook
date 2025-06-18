'use client';

import { ChatType } from '@/app/api/chat/route';
import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useCreateManager } from '@/components/store/create';
import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { useUserManager } from '@/components/store/user';
import { SubscriptionModal } from '@/components/ui/pricing-modal.tsx';
import { SettingsModal } from '@/components/ui/settings-modal';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePanelMeasurements } from '../_hooks/use-panel-measure';
import { useTabActive } from '../_hooks/use-tab-active';
import { BottomBar } from './bottom-bar';
import { Canvas } from './canvas';
import { EditorBar } from './editor-bar';
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from './top-bar';

export const Main = observer(({ projectId }: { projectId: string }) => {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();
    const createManager = useCreateManager();
    const userManager = useUserManager();
    const { sendMessages } = useChatContext();
    const { data: result, isLoading } = api.project.getFullProject.useQuery({ projectId });
    const leftPanelRef = useRef<HTMLDivElement | null>(null);
    const rightPanelRef = useRef<HTMLDivElement | null>(null);
    const { tabState } = useTabActive();

    const { toolbarLeft, toolbarRight, editorBarAvailableWidth } = usePanelMeasurements(
        leftPanelRef,
        rightPanelRef,
    );

    useEffect(() => {
        const initializeProject = async () => {
            if (!result) {
                return;
            }
            const { project, userCanvas, frames } = result;
            projectManager.project = project;

            if (project.sandbox?.id) {
                if (userManager.user?.id) {
                    if (!editorEngine.sandbox.session.session) {
                        await editorEngine.sandbox.session.start(
                            project.sandbox.id,
                            userManager.user.id,
                        );
                    }
                } else {
                    console.error('Initializing project: No user id');
                }
            } else {
                console.error('Initializing project: No sandbox id');
            }

            editorEngine.canvas.applyCanvas(userCanvas);
            editorEngine.frames.applyFrames(frames);
            await editorEngine.chat.conversation.fetchOrCreateConversation(project.id);
            resumeCreate();
        };

        initializeProject().catch((error) => {
            console.error('Error initializing project:', error);
        });
    }, [result, userManager.user?.id]);

    const resumeCreate = async () => {
        const creationData = createManager.pendingCreationData;
        if (!creationData) return;

        if (projectId !== creationData.project.id) return;

        const messages = await editorEngine.chat.getStreamMessages(
            creationData.prompt,
            creationData.images,
        );

        if (!messages) {
            console.error('Failed to get creation messages');
            return;
        }
        createManager.pendingCreationData = null;
        sendMessages(messages, ChatType.CREATE);
    };

    useEffect(() => {
        if (tabState === 'reactivated') {
            editorEngine.sandbox.session.reconnect(projectId, userManager.user?.id);
        }
    }, [tabState]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2">
                <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                <div className="text-xl">Loading project...</div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
                <div className="text-xl">Project not found</div>
                <Link href={Routes.PROJECTS} className="text-sm text-foreground-secondary">
                    Go to projects
                </Link>
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
                    <TopBar projectId={projectId} />
                </div>

                {/* Left Panel */}
                <div
                    ref={leftPanelRef}
                    className="absolute top-10 left-0 animate-layer-panel-in h-[calc(100%-40px)] z-50"
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
                    className="absolute top-10 right-0 animate-edit-panel-in h-[calc(100%-40px)] z-50"
                >
                    <RightPanel />
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                    <BottomBar />
                </div>
            </div>
            <SettingsModal showProjectTabs={true} />
            <SubscriptionModal />
        </TooltipProvider>
    );
});
