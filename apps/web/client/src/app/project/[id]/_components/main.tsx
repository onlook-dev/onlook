'use client';

import { ChatType } from '@/app/api/chat/route';
import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useCreateManager } from '@/components/store/create';
import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { useUserManager } from '@/components/store/user';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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

    const { tabState } = useTabActive();
    const { data: result, isLoading } = api.project.getFullProject.useQuery({ projectId });
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [toolbarLeft, setToolbarLeft] = useState<number>(0);
    const [toolbarRight, setToolbarRight] = useState<number>(0);
    const [editorBarAvailableWidth, setEditorBarAvailableWidth] = useState<number>(0);

    useEffect(() => {
        if (!result) {
            return;
        }
        const { project, canvas, userCanvas, frames, conversation } = result;
        projectManager.project = project;

        if (project.sandbox?.id) {
            if (userManager.user?.id) {
                editorEngine.sandbox.session.start(project.sandbox.id, userManager.user?.id);
            } else {
                console.error('No user id');
            }
        } else {
            console.error('No sandbox id');
        }

        if (canvas) {
            editorEngine.canvas.applyCanvas(userCanvas);
        } else {
            console.error('No canvas');
        }

        if (frames) {
            editorEngine.frames.applyFrames(frames);
        } else {
            console.error('No frames');
        }

        if (conversation) {
            editorEngine.chat.conversation.setCurrentConversation(conversation);
        }

        return () => {
            editorEngine.sandbox.clear();
        };
    }, [result, userManager.user?.id]);

    useEffect(() => {
        const creationData = createManager.pendingCreationData;
        const shouldCreate = !!creationData && projectId === creationData.project.id;
        const conversationReady = !!editorEngine.chat.conversation.current;
        const sandboxConnected = !!editorEngine.sandbox.session.session;

        if (shouldCreate && conversationReady && sandboxConnected) {
            editorEngine.chat
                .getCreateMessages(creationData.prompt, creationData.images)
                .then((messages) => {
                    if (!messages) {
                        console.error('Failed to get creation messages');
                        return;
                    }
                    createManager.pendingCreationData = null;
                    sendMessages(messages, ChatType.CREATE);
                });
        }
    }, [
        editorEngine.chat.conversation.current,
        createManager.pendingCreationData,
        editorEngine.sandbox.session.session,
    ]);

    useEffect(() => {
        function measure() {
            const left = leftPanelRef.current?.getBoundingClientRect().right ?? 0;
            const right =
                window.innerWidth -
                (rightPanelRef.current?.getBoundingClientRect().left ?? window.innerWidth);
            setToolbarLeft(left);
            setToolbarRight(right);
            setEditorBarAvailableWidth(window.innerWidth - left - right);
        }
        // Initial measure after DOM paint
        requestAnimationFrame(measure);

        // Poll until both panels are rendered and positioned
        let pollInterval: NodeJS.Timeout | null = null;
        pollInterval = setInterval(() => {
            const left = leftPanelRef.current?.getBoundingClientRect().right ?? 0;
            const right =
                window.innerWidth -
                (rightPanelRef.current?.getBoundingClientRect().left ?? window.innerWidth);
            if (left > 0 && right > 0) {
                measure();
                if (pollInterval) clearInterval(pollInterval);
            }
        }, 30);

        window.addEventListener('resize', measure);

        // ResizeObservers for left and right panels
        let leftObserver: ResizeObserver | null = null;
        let rightObserver: ResizeObserver | null = null;
        if (leftPanelRef.current) {
            leftObserver = new ResizeObserver(measure);
            leftObserver.observe(leftPanelRef.current);
        }
        if (rightPanelRef.current) {
            rightObserver = new ResizeObserver(measure);
            rightObserver.observe(rightPanelRef.current);
        }

        return () => {
            window.removeEventListener('resize', measure);
            if (leftObserver) leftObserver.disconnect();
            if (rightObserver) rightObserver.disconnect();
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2">
                <Icons.Shadow className="h-6 w-6 animate-spin text-foreground-primary" />
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
                <Icons.Shadow className="h-6 w-6 animate-spin text-foreground-primary" />
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
        </TooltipProvider>
    );
});
