
import { EditorEngine } from '@/lib/editor/engine';
import Canvas from './Canvas';
import EditorTopBar from './ProjectTopBar';
import EditorPanel from './SidePanel';
import WebviewArea from './webview/WebviewArea';

function ProjectEditor() {
    const editorEngine = new EditorEngine();

    return (
        <>
            <div className='p-2 flex items-center border-b-stone-800 border-b'>
                <EditorTopBar />
            </div>
            <div className="flex flex-row h-full">
                <EditorPanel editorEngine={editorEngine} />
                <Canvas>
                    <WebviewArea editorEngine={editorEngine} />
                </Canvas>
                <EditorPanel editorEngine={editorEngine} />
            </div>
        </>
    );
}

export default ProjectEditor;
