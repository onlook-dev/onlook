import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings } from '@onlook/constants';
import type { Frame } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import type { MouseEvent } from 'react';

enum HandleType {
    Right = 'right',
    Bottom = 'bottom',
}

export const ResizeHandles = observer((
    { frame, setIsResizing }: { frame: Frame, setIsResizing: (isResizing: boolean) => void }) => {
    const editorEngine = useEditorEngine();
    // TODO implement aspect ratio lock
    const aspectRatioLocked = false;
    const lockedPreset = false;

    const startResize = (e: MouseEvent, types: HandleType[]) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = frame.dimension.width;
        const startHeight = frame.dimension.height;
        const aspectRatio = startWidth / startHeight;

        const resize = (e: MouseEvent) => {
            const scale = editorEngine.canvas.scale;
            let widthDelta = types.includes(HandleType.Right) ? (e.clientX - startX) / scale : 0;
            let heightDelta = types.includes(HandleType.Bottom) ? (e.clientY - startY) / scale : 0;

            let newWidth = startWidth + widthDelta;
            let newHeight = startHeight + heightDelta;

            const minWidth = parseInt(DefaultSettings.MIN_DIMENSIONS.width);
            const minHeight = parseInt(DefaultSettings.MIN_DIMENSIONS.height);

            if (aspectRatioLocked) {
                if (types.includes(HandleType.Right) && !types.includes(HandleType.Bottom)) {
                    newHeight = newWidth / aspectRatio;
                } else if (!types.includes(HandleType.Right) && types.includes(HandleType.Bottom)) {
                    newWidth = newHeight * aspectRatio;
                } else {
                    if (Math.abs(widthDelta) > Math.abs(heightDelta)) {
                        newHeight = newWidth / aspectRatio;
                    } else {
                        newWidth = newHeight * aspectRatio;
                    }
                }

                if (newWidth < minWidth) {
                    newWidth = minWidth;
                    newHeight = newWidth / aspectRatio;
                }
                if (newHeight < minHeight) {
                    newHeight = minHeight;
                    newWidth = newHeight * aspectRatio;
                }
            } else {
                newWidth = Math.max(newWidth, minWidth);
                newHeight = Math.max(newHeight, minHeight);
            }

            editorEngine.frames.updateAndSaveToStorage(frame.id, { dimension: { width: Math.round(newWidth), height: Math.round(newHeight) } });
            editorEngine.overlay.undebouncedRefresh();
        };

        const stopResize = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(false);
            window.removeEventListener('mousemove', resize as unknown as EventListener);
            window.removeEventListener('mouseup', stopResize as unknown as EventListener);
        };

        window.addEventListener('mousemove', resize as unknown as EventListener);
        window.addEventListener('mouseup', stopResize as unknown as EventListener);
    };

    return (
        <div
            className={cn(
                'absolute inset-0 opacity-40 transition min-w-0 visible hover:opacity-60',
                lockedPreset && 'hover:opacity-40',
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-center absolute -bottom-10 w-full h-10',
                    lockedPreset ? 'cursor-not-allowed' : 'cursor-s-resize',
                )}
                onMouseDown={(e) => startResize(e, [HandleType.Bottom])}
            >
                <div className="rounded bg-foreground-primary/80 w-48 h-1"></div>
            </div>
            <div
                className={cn(
                    'flex items-center justify-center absolute -right-10 h-full w-10',
                    lockedPreset ? 'cursor-not-allowed' : 'cursor-e-resize',
                )}
                onMouseDown={(e) => startResize(e, [HandleType.Right])}
            >
                <div className="rounded bg-foreground-primary/80 w-1 h-48"></div>
            </div>
            <div
                className={cn(
                    'flex items-center justify-center absolute -bottom-10 -right-10 w-10 h-10',
                    lockedPreset ? 'cursor-not-allowed' : 'cursor-se-resize',
                )}
                onMouseDown={(e) => startResize(e, [HandleType.Right, HandleType.Bottom])}
            >
                <div className="rounded bg-foreground-primary/80 w-2 h-2"></div>
            </div>
        </div>
    );
});
