import { EditorEngine } from '@/lib/editor/engine';
import { createContext, useContext } from 'react';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import LayersPanel from './LayersPanel';
import Toolbar from './Toolbar';
import EditorTopBar from './TopBar';
import WebviewArea from './WebviewArea';

const EditorEngineContext = createContext(new EditorEngine());
export const useEditorEngine = () => useContext(EditorEngineContext);

function ProjectEditor() {
    return (
        <EditorEngineContext.Provider value={useEditorEngine()}>
            <div className="relative flex flex-row h-[calc(100vh-2.5rem)]">
                <Canvas>
                    <WebviewArea />
                </Canvas>
                <div className="absolute top-0 w-full">
                    <EditorTopBar />
                </div>
                <div className="absolute top-10 left-0">
                    <LayersPanel />
                </div>
                <div className="absolute top-10 right-0">
                    <EditPanel />
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Toolbar />
                </div>
            </div>
        </EditorEngineContext.Provider>
    );
}

export default ProjectEditor;
