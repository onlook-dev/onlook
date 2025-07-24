'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { FrameData } from '@/components/store/editor/frames';
import { observer } from 'mobx-react-lite';
import { FrameView } from './frame';

export const Frames = observer(() => {
    const editorEngine = useEditorEngine();
    const frames = editorEngine.frames.getAll();

    return (
        <div className="grid grid-flow-col gap-72">
            {frames.map((frame: FrameData) => (
                <FrameView key={frame.frame.id} frame={frame.frame} />
            ))}
        </div>
    );
});
