
import React from 'react';
import Canvas from './Canvas';
import EditorPanel from './EditorPanel';
import EditorTopBar from './EditorTopBar';
import FrameList from './FrameList';

function ProjectEditor() {
    return (
        <div className="flex flex-col">
            <div className='p-2 h-12 flex items-center border-b-stone-800 border-b'>
                <EditorTopBar />
            </div>
            <div className="flex flex-row overflow-hidden">
                <EditorPanel />
                <Canvas>
                    <FrameList />
                </Canvas>
                <EditorPanel />
            </div>
        </div>
    );
}

export default ProjectEditor;
