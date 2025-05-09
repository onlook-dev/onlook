'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { FrameImpl } from '@/components/store/editor/canvas/frame';
import { observer } from 'mobx-react-lite';
import { FrameView } from './frame';

export const Frames = observer(() => {
    const editorEngine = useEditorEngine();
    const frames = editorEngine.canvas.frames;

    return (
        <div className="grid grid-flow-col gap-72">
            {frames.map((frame: FrameImpl) => (
                <FrameView key={frame.id} frame={frame} />
            ))}
        </div>
    );
});
