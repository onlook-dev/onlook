import { EditorEngine } from '@/lib/editor/engine';
import { createContext, useContext } from 'react';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import LayersPanel from './LayersPanel';
import EditorTopBar from './ProjectTopBar';
import WebviewArea from './WebviewArea';

const EditorEngineContext = createContext(new EditorEngine());
export const useEditorEngine = () => useContext(EditorEngineContext);

function ProjectEditor() {
    return (
        <EditorEngineContext.Provider value={useEditorEngine()}>
            <EditorTopBar />
            <div className="h-[calc(100vh-5rem)] flex flex-row">
                <LayersPanel />
                <Canvas>
                    <WebviewArea />
                </Canvas>
                <EditPanel />
            </div>
        </EditorEngineContext.Provider>
    );
}

export default ProjectEditor;
