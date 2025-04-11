import { useEditorEngine } from '@/components/store';
import { observer } from 'mobx-react-lite';
import { WebFrameComponent } from '../frame/web-frame';

export const Frames = observer(() => {
    const editorEngine = useEditorEngine();
    
    return (
        <>
            {editorEngine.canvas.frames.map((frame) => (
                <WebFrameComponent key={frame.id} frame={frame} />
            ))}
        </>
    );
});
