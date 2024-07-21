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
            <div className="absolute inset-0 opacity-10 transition hover:opacity-60">
                <div
                    ref={resizeHandleRef}
                    className="flex items-center justify-center absolute -bottom-10 w-full cursor-s-resize h-10"
                    onMouseDown={startResize}
                >
                    <div className="rounded bg-white w-32 h-1"></div>
                </div>
                <div
                    ref={resizeHandleRef}
                    className="flex items-center justify-center absolute -right-10 h-full cursor-e-resize w-10"
                    onMouseDown={startResize}
                >
                    {' '}
                    <div className="rounded bg-white w-1 h-32"></div>
                </div>
                <div
                    ref={resizeHandleRef}
                    className="flex items-center justify-center absolute -bottom-10 -right-10 cursor-se-resize w-10 h-10"
                    onMouseDown={startResize}
                >
                    <div className="rounded bg-white w-2 h-2"></div>
                </div>
            </div>
        )
    );
});

export default ResizeHandles;
