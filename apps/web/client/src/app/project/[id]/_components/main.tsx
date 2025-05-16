'use client';

import { ChatProvider } from '@/app/project/[id]/_hooks/use-chat';
import { useCreateManager } from '@/components/store/create';
import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
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
    const { tabState } = useTabActive();
    const { data: result, isLoading } = api.project.getFullProject.useQuery({ projectId });
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [center, setCenter] = useState<number | null>(null);
    const creationData = createManager.pendingCreationData;

    useEffect(() => {
        setTimeout(() => {
            updateCenter();
        }, 100);
        window.addEventListener('resize', updateCenter);
        return () => {
            window.removeEventListener('resize', updateCenter);
        };
    }, []);

    function updateCenter() {
        const left = leftPanelRef.current?.getBoundingClientRect();
        const right = rightPanelRef.current?.getBoundingClientRect();
        if (left && right) {
            setCenter(left.right + (right.left - left.right) / 2);
        }
    }

    useEffect(() => {
        if (!result) {
            return;
        }
        const { project, canvas, frames, conversation } = result;
        projectManager.project = project;

        if (project.sandbox?.id) {
            editorEngine.sandbox.session.start(project.sandbox.id);
        } else {
            console.error('No sandbox id');
        }

        if (canvas) {
            editorEngine.canvas.applyCanvas(canvas);
        } else {
            console.error('No canvas');
        }

        if (frames) {
            editorEngine.canvas.applyFrames(frames);
        } else {
            console.error('No frames');
        }

        if (conversation) {
            editorEngine.chat.conversation.setCurrentConversation(conversation);
        }

        if (creationData) {
            createManager.resumeCreate();
        }

        return () => {
            editorEngine.sandbox.clear();
        };
    }, [result, creationData]);

    useEffect(() => {
        if (tabState === 'reactivated' && editorEngine.sandbox.session.session) {
            editorEngine.sandbox.session.reconnect();
        }
    }, [tabState]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
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

    // TODO: Add better loading state
    // if (editorEngine.sandbox.session.isConnecting || isLoading) {
    //     return (
    //         <div className="h-screen w-screen flex items-center justify-center gap-2">
    //             <Icons.Shadow className="h-6 w-6 animate-spin" />
    //             <div className="text-xl">Connecting to sandbox...</div>
    //         </div>
    //     );
    // }

    return (
        <ChatProvider>
            <TooltipProvider>
                <div className="h-screen w-screen flex flex-row select-none relative">
                    <Canvas />

                    <div className="absolute top-0 w-full">
                        <TopBar />
                    </div>

                    {/* Left Panel */}
                    <div ref={leftPanelRef} className="absolute top-10 left-0 animate-layer-panel-in h-[calc(100%-40px)] z-50">
                        <LeftPanel />
                    </div>

                    {/* Centered EditorBar */}
                    <div
                        className="absolute top-10 z-49"
                        style={{ left: center ? center : '40%', transform: 'translateX(-50%)' }}
                    >
                        <EditorBar />
                    </div>

                    {/* Right Panel */}
                    <div ref={rightPanelRef} className="absolute top-10 right-0 animate-edit-panel-in h-[calc(100%-40px)] z-50">
                        <RightPanel />
                    </div>

                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                        <BottomBar />
                    </div>
                </div>
            </TooltipProvider >
        </ChatProvider >
    );
});
