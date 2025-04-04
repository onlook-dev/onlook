import { useEditorEngine } from '@/components/store';
import type { SizePreset } from '@/components/store/editor/engine/canvas';
import { DefaultSettings } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import { ToastAction } from '@onlook/ui/toast';
import { useToast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { type MouseEvent, useRef, useState } from 'react';

enum HandleType {
    Right = 'right',
    Bottom = 'bottom',
}

export const ResizeHandles = observer(
    ({
        settings,
    }: {
        settings: FrameSettings;
    }) => {
        const editorEngine = useEditorEngine();
        const resizeHandleRef = useRef(null);
        const { toast } = useToast();

        // TODO: Move these to the store
        const [size, setSize] = useState(settings.dimension);
        const [isResizing, setIsResizing] = useState<boolean>(false);
        const [aspectRatioLocked, setAspectRatioLocked] = useState(
            settings.aspectRatioLocked || DefaultSettings.ASPECT_RATIO_LOCKED,
        );
        const [selectedPreset, setSelectedPreset] = useState<SizePreset | null>(null);
        const [lockedPreset, setLockedPreset] = useState<SizePreset | null>(null);

        const startResize = (
            e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
            types: HandleType[],
        ) => {
            e.preventDefault();
            e.stopPropagation();

            setIsResizing(true);

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = size.width;
            const startHeight = size.height;
            const aspectRatio = startWidth / startHeight;

            const resize: any = (e: MouseEvent) => {
                const scale = editorEngine.canvas.scale;
                let heightDelta = types.includes(HandleType.Bottom)
                    ? (e.clientY - startY) / scale
                    : 0;
                let widthDelta = types.includes(HandleType.Right)
                    ? (e.clientX - startX) / scale
                    : 0;

                let currentWidth = startWidth + widthDelta;
                let currentHeight = startHeight + heightDelta;

                if (aspectRatioLocked) {
                    if (types.includes(HandleType.Right) && !types.includes(HandleType.Bottom)) {
                        heightDelta = widthDelta / aspectRatio;
                    } else if (
                        !types.includes(HandleType.Right) &&
                        types.includes(HandleType.Bottom)
                    ) {
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

                setSize({
                    width: Math.floor(currentWidth),
                    height: Math.floor(currentHeight),
                });

                setSelectedPreset(null);
            };

            const stopResize = (e: any) => {
                e.preventDefault();
                e.stopPropagation();

                setIsResizing(false);

                window.removeEventListener('mousemove', resize);
                window.removeEventListener('mouseup', stopResize);
            };

            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        };

        const handleLockedResize = () => {
            const unlockPresetToast = () => {
                setLockedPreset(null);
            };

            toast({
                title: 'Preset dimensions locked.',
                description: 'Unlock to resize.',
                action: (
                    <ToastAction altText="Unlock" onClick={unlockPresetToast}>
                        Unlock
                    </ToastAction>
                ),
            });
        };

        return (
            <div
                className={cn('absolute inset-0 opacity-40 transition min-w-0 visible', {
                    'hover:opacity-60': !lockedPreset,
                })}
            >
                <div
                    ref={resizeHandleRef}
                    className={cn(
                        'flex items-center justify-center absolute -bottom-10 w-full h-10',
                        lockedPreset ? 'cursor-not-allowed' : 'cursor-s-resize',
                    )}
                    onMouseDown={(e) =>
                        lockedPreset ? handleLockedResize() : startResize(e, [HandleType.Bottom])
                    }
                >
                    <div className="rounded bg-foreground-primary/80 w-48 h-1"></div>
                </div>
                <div
                    ref={resizeHandleRef}
                    className={cn(
                        'flex items-center justify-center absolute -right-10 h-full w-10',
                        lockedPreset ? 'cursor-not-allowed' : 'cursor-e-resize',
                    )}
                    onMouseDown={(e) =>
                        lockedPreset ? handleLockedResize() : startResize(e, [HandleType.Right])
                    }
                >
                    <div className="rounded bg-foreground-primary/80 w-1 h-48"></div>
                </div>
                <div
                    ref={resizeHandleRef}
                    className={cn(
                        'flex items-center justify-center absolute -bottom-10 -right-10 w-10 h-10',
                        lockedPreset ? 'cursor-not-allowed' : 'cursor-se-resize',
                    )}
                    onMouseDown={(e) =>
                        lockedPreset
                            ? handleLockedResize()
                            : startResize(e, [HandleType.Right, HandleType.Bottom])
                    }
                >
                    <div className="rounded bg-foreground-primary/80 w-2 h-2"></div>
                </div>
            </div>
        );
    },
);
