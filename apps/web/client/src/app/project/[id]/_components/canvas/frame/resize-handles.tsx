import type { MouseEvent } from 'react';
import { observer } from 'mobx-react-lite';

import type { Frame } from '@onlook/models';
import { DefaultSettings } from '@onlook/constants';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';

enum HandleType {
    Right = 'right',
    Bottom = 'bottom',
}

export const ResizeHandles = observer(
    ({ frame, setIsResizing }: { frame: Frame; setIsResizing: (isResizing: boolean) => void }) => {
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
                const widthDelta = types.includes(HandleType.Right)
                    ? (e.clientX - startX) / scale
                    : 0;
                const heightDelta = types.includes(HandleType.Bottom)
                    ? (e.clientY - startY) / scale
                    : 0;

                let newWidth = startWidth + widthDelta;
                let newHeight = startHeight + heightDelta;

                const minWidth = parseInt(DefaultSettings.MIN_DIMENSIONS.width);
                const minHeight = parseInt(DefaultSettings.MIN_DIMENSIONS.height);

                if (aspectRatioLocked) {
                    if (types.includes(HandleType.Right) && !types.includes(HandleType.Bottom)) {
                        newHeight = newWidth / aspectRatio;
                    } else if (
                        !types.includes(HandleType.Right) &&
                        types.includes(HandleType.Bottom)
                    ) {
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

                editorEngine.frames.updateAndSaveToStorage(frame.id, {
                    dimension: { width: Math.round(newWidth), height: Math.round(newHeight) },
                });
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
                    'visible absolute inset-0 min-w-0 opacity-40 transition hover:opacity-60',
                    lockedPreset && 'hover:opacity-40',
                )}
            >
                <div
                    className={cn(
                        'absolute -bottom-10 flex h-10 w-full items-center justify-center',
                        lockedPreset ? 'cursor-not-allowed' : 'cursor-s-resize',
                    )}
                    onMouseDown={(e) => startResize(e, [HandleType.Bottom])}
                >
                    <div className="bg-foreground-primary/80 h-1 w-48 rounded"></div>
                </div>
                <div
                    className={cn(
                        'absolute -right-10 flex h-full w-10 items-center justify-center',
                        lockedPreset ? 'cursor-not-allowed' : 'cursor-e-resize',
                    )}
                    onMouseDown={(e) => startResize(e, [HandleType.Right])}
                >
                    <div className="bg-foreground-primary/80 h-48 w-1 rounded"></div>
                </div>
                <div
                    className={cn(
                        'absolute -right-10 -bottom-10 flex h-10 w-10 items-center justify-center',
                        lockedPreset ? 'cursor-not-allowed' : 'cursor-se-resize',
                    )}
                    onMouseDown={(e) => startResize(e, [HandleType.Right, HandleType.Bottom])}
                >
                    <div className="bg-foreground-primary/80 h-2 w-2 rounded"></div>
                </div>
            </div>
        );
    },
);
