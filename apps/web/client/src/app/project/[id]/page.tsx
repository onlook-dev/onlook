
import { Frames } from './_components/canvas/frames';
import { RightPanel } from './_components/right-panel';
// import { HotkeysModal } from './HotkeysModal';
// import { LayersPanel } from './LayersPanel';
// import { Toolbar } from './Toolbar';

import { Canvas } from "./_components/canvas";
import { TopBar } from "./_components/top-bar";

export default async function Page({ }: { params: { id: string } }) {
    return (
        <div className="relative h-screen w-screen flex flex-row select-none">
            <Canvas>
                <Frames />
            </Canvas>

            <div className="absolute top-10 left-0 animate-layer-panel-in h-[calc(100%-2.60rem)]">
                {/* <LeftPanel /> */}
            </div>

            <div className="absolute top-10 right-0 animate-edit-panel-in h-[calc(100%-2.60rem)]">
                <RightPanel />
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up ">
                {/* <Toolbar /> */}
            </div>

            <div className="absolute top-0 w-full">
                <TopBar />
            </div>
            {/* <HotkeysModal /> */}
        </div>
    );
}