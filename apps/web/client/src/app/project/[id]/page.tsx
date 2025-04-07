"use client";

import { Frames } from './_components/canvas/frames';
// import { HotkeysModal } from './HotkeysModal';
// import { Toolbar } from './Toolbar';

import { useState } from "react";
import { Canvas } from "./_components/canvas";
import { EditorBar } from "./_components/editor-bar";
import { StagingToggle } from "./_components/editor-bar/staging-toggle";
import { LeftPanel } from './_components/left-panel';
import { RightPanel } from './_components/right-panel';
import { TopBar } from "./_components/top-bar";

type ElementType = "div" | "text" | "image";

export default function Page({ }: { params: { id: string } }) {
    const [selectedElement, setSelectedElement] = useState<ElementType>("div");

    return (
        <div className="h-screen w-screen flex flex-row select-none relative">
            <Canvas>
                <Frames />
            </Canvas>

            <div className="absolute top-10 left-0 animate-layer-panel-in h-[calc(100%-2.60rem)] z-1">
                <LeftPanel />
            </div>

            <div className="absolute top-10 right-0 animate-edit-panel-in h-[calc(100%-2.60rem)] z-1">
                <RightPanel />
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                {/* <Toolbar /> */}
            </div>

            <div className="absolute top-0 w-full">
                <TopBar />
            </div>

            <div className="absolute top-10 w-full">
                <EditorBar selectedElement={selectedElement} />
            </div>

            <div className="absolute top-10 w-full">
                <StagingToggle selectedElement={selectedElement} onElementSelect={setSelectedElement} />
            </div>
            {/* <HotkeysModal /> */}
        </div>
    );
}