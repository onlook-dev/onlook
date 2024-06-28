import { EditorEngine } from '@/lib/editor/engine';
import { createContext, useContext } from 'react';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import LayersPanel from './LayersPanel';
import EditorTopBar from './ProjectTopBar';
import WebviewArea from './webview/WebviewArea';

const EditorEngineContext = createContext(new EditorEngine());
export const useEditorEngine = () => useContext(EditorEngineContext);

function ProjectEditor() {
    return (
        <EditorEngineContext.Provider value={useEditorEngine()}>
            <div className='p-2 flex items-center border-b-stone-800 border-b'>
                <EditorTopBar />
            </div>
            <div className="flex flex-row h-full">
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
