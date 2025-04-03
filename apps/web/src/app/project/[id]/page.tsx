
import { Frames } from './_components/canvas/frames';

// import { EditPanel } from './EditPanel';
// import { HotkeysModal } from './HotkeysModal';
// import { LayersPanel } from './LayersPanel';
// import { Toolbar } from './Toolbar';

import { Canvas } from "./_components/canvas";
import { EditorTopBar } from "./_components/top-bar";

export default async function Page({ params }: { params: { id: string } }) {
    const id = (await params).id
    return (
        <div className="h-screen w-screen relative flex flex-row select-none">
            <Canvas>
                <Frames />
            </Canvas>

            <div className="fixed top-20 left-0 animate-layer-panel-in">
                {/* <LayersPanel /> */}
            </div>

            <div className="fixed top-20 right-0 animate-edit-panel-in">
                {/* <EditPanel /> */}
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                {/* <Toolbar /> */}
            </div>

            <div className="absolute top-0 w-full">
                <EditorTopBar />
            </div>
            {/* <HotkeysModal /> */}
        </div>
    );
}