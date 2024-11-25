import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import type { SizePreset } from '@/lib/sizePresets';
import { ToastAction } from '@onlook/ui/toast';
import { useToast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { type MouseEvent, useRef } from 'react';

interface ResizeHandleProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    webviewSize: { width: number; height: number };
    setWebviewSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
    selectedPreset: SizePreset | null;
    setSelectedPreset: React.Dispatch<React.SetStateAction<SizePreset | null>>;
    lockedPreset: SizePreset | null;
    setLockedPreset: React.Dispatch<React.SetStateAction<SizePreset | null>>;
    setIsResizing: React.Dispatch<React.SetStateAction<boolean>>;
}

enum HandleType {
    Right = 'right',
    Bottom = 'bottom',
}

const ResizeHandles = observer(
    ({
        webviewSize,
        setWebviewSize,
        setSelectedPreset,
        lockedPreset,
        setLockedPreset,
        setIsResizing,
    }: ResizeHandleProps) => {
        const editorEngine = useEditorEngine();
        const resizeHandleRef = useRef(null);
        const { toast } = useToast();

        const startResize = (
            e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
            types: HandleType[],
        ) => {
            e.preventDefault();
            e.stopPropagation();

            setIsResizing(true);

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = webviewSize.width;
            const startHeight = webviewSize.height;

            const resize: any = (e: MouseEvent) => {
                const scale = editorEngine.canvas.scale;
                const heightDelta = types.includes(HandleType.Bottom)
                    ? (e.clientY - startY) / scale
                    : 0;
                const widthDelta = types.includes(HandleType.Right)
                    ? (e.clientX - startX) / scale
                    : 0;
                const currentWidth = startWidth + widthDelta;
                const currentHeight = startHeight + heightDelta;
                setWebviewSize({ width: currentWidth, height: currentHeight });
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
                className={cn(
                    'absolute inset-0 opacity-10 transition min-w-0',
                    editorEngine.mode === EditorMode.INTERACT ? 'visible' : 'visible',
                    { 'hover:opacity-60': !lockedPreset },
                )}
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
                    <div className="rounded bg-foreground-primary w-32 h-1"></div>
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
                    <div className="rounded bg-foreground-primary w-1 h-32"></div>
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
                    <div className="rounded bg-foreground-primary w-2 h-2"></div>
                </div>
            </div>
        );
    },
);

export default ResizeHandles;
