import { useEditorEngine } from '@/components/store/editor';
import type { FrameImpl } from '@/components/store/editor/frames/frame';
import { DefaultSettings } from '@onlook/constants';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { type MouseEvent } from 'react';

enum HandleType {
    Right = 'right',
    Bottom = 'bottom',
}

export const ResizeHandles = observer(({ frame }: { frame: FrameImpl }) => {
    const editorEngine = useEditorEngine();
    const aspectRatioLocked = false;
    const lockedPreset = false;

    const startResize = (e: MouseEvent, types: HandleType[]) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = frame.dimension.width;
        const startHeight = frame.dimension.height;
        const aspectRatio = startWidth / startHeight;

        const resize = (e: MouseEvent) => {
            const scale = editorEngine.canvas.scale;
            let heightDelta = types.includes(HandleType.Bottom) ? (e.clientY - startY) / scale : 0;
            let widthDelta = types.includes(HandleType.Right) ? (e.clientX - startX) / scale : 0;

            let currentWidth = startWidth + widthDelta;
            let currentHeight = startHeight + heightDelta;

            if (aspectRatioLocked) {
                if (types.includes(HandleType.Right) && !types.includes(HandleType.Bottom)) {
                    heightDelta = widthDelta / aspectRatio;
                } else if (!types.includes(HandleType.Right) && types.includes(HandleType.Bottom)) {
                    widthDelta = heightDelta * aspectRatio;
                } else {
                    if (Math.abs(widthDelta) > Math.abs(heightDelta)) {
                        heightDelta = widthDelta / aspectRatio;
                    } else {
                        widthDelta = heightDelta * aspectRatio;
                    }
                }

                currentWidth = startWidth + widthDelta;
                currentHeight = startHeight + heightDelta;

                if (currentWidth < parseInt(DefaultSettings.MIN_DIMENSIONS.width)) {
                    currentWidth = parseInt(DefaultSettings.MIN_DIMENSIONS.width);
                    currentHeight = currentWidth / aspectRatio;
                }
                if (currentHeight < parseInt(DefaultSettings.MIN_DIMENSIONS.height)) {
                    currentHeight = parseInt(DefaultSettings.MIN_DIMENSIONS.height);
                    currentWidth = currentHeight * aspectRatio;
                }
            } else {
                if (currentWidth < parseInt(DefaultSettings.MIN_DIMENSIONS.width)) {
                    currentWidth = parseInt(DefaultSettings.MIN_DIMENSIONS.width);
                }
                if (currentHeight < parseInt(DefaultSettings.MIN_DIMENSIONS.height)) {
                    currentHeight = parseInt(DefaultSettings.MIN_DIMENSIONS.height);
                }
            }

            frame.dimension = {
                width: Math.floor(currentWidth),
                height: Math.floor(currentHeight),
            };
        };

        const stopResize = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

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
