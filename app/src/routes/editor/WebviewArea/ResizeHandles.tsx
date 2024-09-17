import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { MouseEvent, useRef } from 'react';
import { useEditorEngine } from '..';

interface ResizeHandleProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    webviewSize: { width: number; height: number };
    setWebviewSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
}

enum HandleType {
    Right = 'right',
    Bottom = 'bottom',
}

const ResizeHandles = observer(({ webviewSize, setWebviewSize }: ResizeHandleProps) => {
    const editorEngine = useEditorEngine();
    const resizeHandleRef = useRef(null);

    const startResize = (
        e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
        types: HandleType[],
    ) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = webviewSize.width;
        const startHeight = webviewSize.height;

        const resize: any = (e: MouseEvent) => {
            const scale = editorEngine.canvas.scale;
            const heightDelta = types.includes(HandleType.Bottom)
                ? (e.clientY - startY) / scale
                : 0;
            const widthDelta = types.includes(HandleType.Right) ? (e.clientX - startX) / scale : 0;
            const currentWidth = startWidth + widthDelta;
            const currentHeight = startHeight + heightDelta;
            setWebviewSize({ width: currentWidth, height: currentHeight });
        };

        const stopResize = (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    };

    return (
        <div
            className={clsx(
                'absolute inset-0 opacity-10 transition hover:opacity-60',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
            )}
        >
            <div
                ref={resizeHandleRef}
                className="flex items-center justify-center absolute -bottom-10 w-full cursor-s-resize h-10"
                onMouseDown={(e) => startResize(e, [HandleType.Bottom])}
            >
                <div className="rounded bg-white w-32 h-1"></div>
            </div>
            <div
                ref={resizeHandleRef}
                className="flex items-center justify-center absolute -right-10 h-full cursor-e-resize w-10"
                onMouseDown={(e) => startResize(e, [HandleType.Right])}
            >
                <div className="rounded bg-white w-1 h-32"></div>
            </div>
            <div
                ref={resizeHandleRef}
                className="flex items-center justify-center absolute -bottom-10 -right-10 cursor-se-resize w-10 h-10"
                onMouseDown={(e) => startResize(e, [HandleType.Right, HandleType.Bottom])}
            >
                <div className="rounded bg-white w-2 h-2"></div>
            </div>
        </div>
    );
});

export default ResizeHandles;
