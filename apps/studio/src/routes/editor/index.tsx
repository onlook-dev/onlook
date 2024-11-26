import { useEditorEngine } from '@/components/Context';
import { useEffect, useState } from 'react';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import LayersPanel from './LayersPanel';
import ResizablePanel from './LayersPanel/ResizablePanel';
import Toolbar from './Toolbar';
import EditorTopBar from './TopBar';
import WebviewArea from './WebviewArea';

function ProjectEditor() {
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3;
    const editorEngine = useEditorEngine();

    const [scale, setScale] = useState(editorEngine.canvas.scale);
    const [position, setPosition] = useState(editorEngine.canvas.position);

    const handleScale = (newScale: number) => {
        const clampedScale = Math.min(Math.max(newScale, MIN_ZOOM), MAX_ZOOM);
        setScale(clampedScale);
        editorEngine.canvas.scale = scale;
    };

    const handlePosition = (newPosition: { x: number; y: number }) => {
        setPosition(newPosition);
        editorEngine.canvas.position = position;
    };

    useEffect(() => {
        editorEngine.canvas.scale = scale;
        editorEngine.canvas.position = position;
    }, [scale, position]);

    return (
        <>
            <div className="relative flex flex-row h-[calc(100vh-2.5rem)] select-none">
                <Canvas
                    position={position}
                    scale={scale}
                    onPositionChange={handlePosition}
                    onScaleChange={handleScale}
                >
                    <WebviewArea />
                </Canvas>
                <ResizablePanel>
                    <div className="left-0 animate-layer-panel-in">
                        <LayersPanel />
                    </div>
                </ResizablePanel>
                <div className="fixed right-0 top-20 animate-edit-panel-in">
                    <EditPanel />
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up">
                    <Toolbar />
                </div>
                <div className="absolute top-0 w-full">
                    <EditorTopBar
                        handlePosition={handlePosition}
                        scale={scale}
                        handleScale={handleScale}
                    />
                </div>
            </div>
        </>
    );
}

export default ProjectEditor;
