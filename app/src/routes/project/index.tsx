import { EditorEngine } from '@/lib/editor/engine';
import { createContext, useContext, useRef, useState } from 'react';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import LayersPanel from './LayersPanel';
import Toolbar from './Toolbar';
import EditorTopBar from './TopBar';
import WebviewArea from './WebviewArea';
import clsx from 'clsx';
const EditorEngineContext = createContext(new EditorEngine());
export const useEditorEngine = () => useContext(EditorEngineContext);
function ProjectEditor() {
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelWidth, setPanelWidth] = useState(240);
    const startResize = (e: any) => {
        e.preventDefault();
        e.stopPropagation();

        const panel = panelRef.current;
        if (!panel) {
            return;
        }
        const startX = e.clientX;
        const boundingRect = panel.getBoundingClientRect();
        const startWidth = boundingRect.width;

        const resize: any = (e: MouseEvent) => {
            const currentWidth = startWidth + e.clientX - startX;
            setPanelWidth(currentWidth);
        };

        const stopResize = (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    };
    return (
        <EditorEngineContext.Provider value={useEditorEngine()}>
            <div className="relative flex flex-row h-[calc(100vh-2.5rem)]">
                <Canvas>
                    <WebviewArea />
                </Canvas>
                <div
                    className={clsx('absolute top-10 left-0 w-60 min-w-60 max-w-96 h-full')}
                    ref={panelRef}
                    style={{ width: `${panelWidth}px` }}
                >
                    <LayersPanel />
                    <div
                        className="top-0 h-full w-2 absolute right-0 cursor-ew-resize z-50 flex items-center justify-center"
                        onMouseDown={startResize}
                    />
                </div>
                <div className="absolute top-10 right-0">
                    <EditPanel />
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Toolbar />
                </div>
                <div className="absolute top-0 w-full">
                    <EditorTopBar />
                </div>
            </div>
        </EditorEngineContext.Provider>
    );
}

export default ProjectEditor;
