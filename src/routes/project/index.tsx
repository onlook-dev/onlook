
import Canvas from './Canvas';
import EditorPanel from './EditorPanel';
import EditorTopBar from './EditorTopBar';
import WebviewArea from './webview/WebviewArea';

function ProjectEditor() {
    return (
        <>
            <div className='p-2 flex items-center border-b-stone-800 border-b'>
                <EditorTopBar />
            </div>
            <div className="flex flex-row h-full">
                <EditorPanel />
                <Canvas>
                    <WebviewArea />
                </Canvas>
                <EditorPanel />
            </div>
        </>
    );
}

export default ProjectEditor;
