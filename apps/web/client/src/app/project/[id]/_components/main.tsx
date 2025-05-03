'use client';

import { ChatProvider } from "@/app/project/[id]/_hooks/use-chat";
import { useEditorEngine, useProjectManager } from "@/components/store";
import type { Project } from "@onlook/models";
import { Icons } from "@onlook/ui/icons/index";
import { TooltipProvider } from "@onlook/ui/tooltip";
import { useEffect } from "react";
import { useSandbox } from "../_hooks/use-sandbox";
import { useTabActive } from "../_hooks/use-tab-active";
import { BottomBar } from "./bottom-bar";
import { Canvas } from "./canvas";
import { EditorBar } from "./editor-bar";
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from "./top-bar";

export function Main({ project }: { project: Project }) {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();
    const { startSession, isStarting, session, isReconnecting, reconnect } = useSandbox();
    const { tabState } = useTabActive();

    useEffect(() => {
        projectManager.project = project;
        editorEngine.canvas.applyProject(project);
        registerSandbox(project);

        return () => {
            editorEngine.sandbox.clear();
        };
    }, [project]);

    const registerSandbox = async (project: Project) => {
        const sandboxId = project.sandbox?.id;
        if (!sandboxId) {
            console.error('No sandbox found');
            return;
        }
        startSession(sandboxId);
    }

    useEffect(() => {
        if (session) {
            editorEngine.sandbox.init(session);
            editorEngine.sandbox.index();
        }
    }, [session]);

    useEffect(() => {
        if (tabState === 'reactivated' && session) {
            reconnect(session.id);
        }
    }, [tabState, session]);

    if (isStarting) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2">
                <Icons.Shadow className="h-6 w-6 animate-spin" />
                <div className="text-xl">Starting animation goes here...</div>
            </div>
        );
    }

    return (
        <ChatProvider>
            <TooltipProvider>
                <div className="h-screen w-screen flex flex-row select-none relative">
                    <Canvas />

                    <div className="absolute top-0 w-full">
                        <TopBar />
                    </div>

                    <div className="absolute top-10 w-full z-50">
                        <EditorBar />
                    </div>

                    {/* TODO: Remove these */}
                    {/* 
                    <div className="absolute w-screen h-screen flex items-center justify-center z-30">
                        <StagingToggle selectedElement={selectedElement} onElementSelect={setSelectedElement} />
                    </div> 
                    <div className="absolute top-20 left-[80px] z-50 h-[calc(100%-80px)]">
                        <Panels selectedElement={selectedElement} />
                    </div> 
                     */}

                    <div className="absolute top-20 left-0 animate-layer-panel-in h-[calc(100%-80px)] z-1">
                        <LeftPanel />
                    </div>


                    <div className="absolute top-20 right-0 animate-edit-panel-in h-[calc(100%-80px)] z-1">
                        <RightPanel />
                    </div>

                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                        <BottomBar />
                    </div>
                </div>
            </TooltipProvider>
        </ChatProvider>
    );
}