import { EditorMode } from '@/lib/editor/engine';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { useEditorEngine } from '..';

interface ResizeHandleProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    webviewSize: { width: number; height: number };
    setWebviewSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
}

const ResizeHandles = observer(({ webviewSize, setWebviewSize }: ResizeHandleProps) => {
    const editorEngine = useEditorEngine();
    const resizeHandleRef = useRef(null);

    const startResize: React.MouseEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = webviewSize.width;
        const startHeight = webviewSize.height;

        const resize = (e: MouseEvent) => {
            const scale = editorEngine.scale;
            const currentWidth = startWidth + (e.clientX - startX) / scale;
            const currentHeight = startHeight + (e.clientY - startY) / scale;
            setWebviewSize({ width: currentWidth, height: currentHeight });
        };

        const stopResize = () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    };

    return (
        editorEngine.mode === EditorMode.Design && (
            <div className="absolute inset-0 bg-red-100">
                <div
                    ref={resizeHandleRef}
                    className="absolute -bottom-10 -right-10 cursor-se-resize bg-white w-5 h-5"
                    onMouseDown={startResize}
                ></div>
            </div>
        )
    );
});

export default ResizeHandles;
