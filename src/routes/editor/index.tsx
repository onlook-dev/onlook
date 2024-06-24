
import React from 'react';
import InfiniteCanvas from './Canvas';
import EditorPanel from './EditorPanel';
import FrameList from './FrameList';

function ProjectEditor() {
    return (
        <div className="flex flex-col">
            <div className='h-10 border-b-stone-800 border-b'></div>
            <div className="flex flex-row overflow-hidden">
                <EditorPanel />
                <InfiniteCanvas>
                    <FrameList />
                </InfiniteCanvas>
                <EditorPanel />
            </div>
        </div>
    );
}

export default ProjectEditor;
