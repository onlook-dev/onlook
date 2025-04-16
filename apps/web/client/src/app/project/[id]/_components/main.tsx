'use client';
// import { HotkeysModal } from './HotkeysModal';
// import { Toolbar } from './Toolbar';

import { useProjectsManager } from "@/components/store";
import type { Project } from "@onlook/models";
import { TooltipProvider } from "@onlook/ui/tooltip";
import { useEffect } from "react";
import { BottomBar } from "./bottom-bar";
import { Canvas } from "./canvas";
import { EditorBar } from "./editor-bar";
import { LeftPanel } from './left-panel';
import { RightPanel } from './right-panel';
import { TopBar } from "./top-bar";

export default function Main({ project }: { project: Project }) {
    const projectManager = useProjectsManager();

    useEffect(() => {
        projectManager.project = project;
    }, [project]);

    return (
        <TooltipProvider>
            <div className="h-screen w-screen flex flex-row select-none relative">
                <Canvas />

                <div className="absolute top-0 w-full">
                    <TopBar />
                </div>

                <div className="absolute top-10 w-full z-50">
                    <EditorBar />
                </div>

                {/* <div className="absolute w-screen h-screen flex items-center justify-center z-30">
                    <StagingToggle selectedElement={selectedElement} onElementSelect={setSelectedElement} />
                </div> */}

                {/* <div className="absolute top-20 left-[80px] z-50 h-[calc(100%-80px)]">
                    <Panels selectedElement={selectedElement} />
                </div> */}

                <div className="absolute top-20 left-0 animate-layer-panel-in h-[calc(100%-80px)] z-1">
                    <LeftPanel />
                </div>


                <div className="absolute top-20 right-0 animate-edit-panel-in h-[calc(100%-80px)] z-1">
                    <RightPanel />
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                    <BottomBar />
                </div>

                {/* <HotkeysModal /> */}
            </div>
        </TooltipProvider>
    );
}