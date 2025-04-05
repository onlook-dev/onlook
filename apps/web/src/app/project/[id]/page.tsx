"use client";

// import { WebviewArea } from './_components/canvas/webview-area';

// import { EditPanel } from './EditPanel';
// import { HotkeysModal } from './HotkeysModal';
// import { LayersPanel } from './LayersPanel';
// import { Toolbar } from './Toolbar';

import { useState } from "react";
import { EditorBar } from "./_components/editor-bar";
import { StagingToggle } from "./_components/editor-bar/staging-toggle";
import { EditorTopBar } from "./_components/top-bar";

type ElementType = "div" | "text" | "image";

export default function Page({ params }: { params: { id: string } }) {
    const id = params.id;
    const [selectedElement, setSelectedElement] = useState<ElementType>("div");

    return (
        <div className="h-screen w-screen relative flex flex-row select-none">
            {/* <Canvas> */}
            {/* <WebviewArea /> */}
            {/* </Canvas> */}

            <div className="fixed top-20 left-0 animate-layer-panel-in">
                {/* <LayersPanel /> */}
            </div>

            <div className="fixed top-20 right-0 animate-edit-panel-in">
                {/* <EditPanel /> */}
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                {/* <Toolbar /> */}
            </div>

            <div className="absolute top-0 w-full z-20">
                <EditorTopBar />
            </div>

            <div className="absolute top-10 w-full z-10">
                <EditorBar selectedElement={selectedElement} />
            </div>

            <div className="absolute top-10 w-full z-1">
                <StagingToggle selectedElement={selectedElement} onElementSelect={setSelectedElement} />
            </div>
            {/* <HotkeysModal /> */}
        </div>
    );
}