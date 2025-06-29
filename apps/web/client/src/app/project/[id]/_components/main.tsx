'use client';

import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useCreateManager } from '@/components/store/create';
import { useEditorEngine } from '@/components/store/editor';
import { SubscriptionModal } from '@/components/ui/pricing-modal.tsx';
import { SettingsModalWithProjects } from '@/components/ui/settings-modal/with-project';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { ChatType, type ChatMessageContext } from '@onlook/models';
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

export const Main = observer(() => {
    const editorEngine = useEditorEngine();
    const createManager = useCreateManager();
    const { data: user } = api.user.get.useQuery();
    const { sendMessages } = useChatContext();
    const { data: result, isLoading } = api.project.getFullProject.useQuery({ projectId: editorEngine.projectId });
    const { tabState } = useTabActive();

    const leftPanelRef = useRef<HTMLDivElement | null>(null);
    const rightPanelRef = useRef<HTMLDivElement | null>(null);

    const { toolbarLeft, toolbarRight, editorBarAvailableWidth } = usePanelMeasurements(
        leftPanelRef,
        rightPanelRef,
    );

    useEffect(() => {
        const initializeProject = async () => {
            if (!result) {
                return;
            }
            const { project, userCanvas, frames, conversations } = result;
            await editorEngine.sandbox.session.start(
                project.sandbox.id,
                user?.id,
            );
            editorEngine.canvas.applyCanvas(userCanvas);
            editorEngine.frames.applyFrames(frames);
            editorEngine.chat.conversation.applyConversations(conversations);
            resumeCreate();
        };

        initializeProject().catch((error) => {
            console.error('Error initializing project:', error);
        });

        return () => {
            editorEngine.sandbox.session.clear();
        };
    }, [result, user?.id, editorEngine.projectId]);

    const resumeCreate = async () => {
        const creationData = createManager.pendingCreationData;
        if (!creationData) return;

        if (editorEngine.projectId !== creationData.project.id) return;

        const createContext: ChatMessageContext[] = await editorEngine.chat.context.getCreateContext();
        const context = [...createContext, ...creationData.images];

        const messages = await editorEngine.chat.getEditMessages(
            creationData.prompt,
            context,
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
            editorEngine.sandbox.session.reconnect(editorEngine.projectId, user?.id);
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
