import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';

export const TopBar = observer(
    ({ frame }: { frame: WebFrame }) => {
        const editorEngine = useEditorEngine();
        const isSelected = editorEngine.frames.isSelected(frame.id);
        const dragState = useRef<{
            startX: number;
            startY: number;
            startPos: { x: number; y: number };
        }>({
            startX: 0,
            startY: 0,
            startPos: { x: 0, y: 0 },
        });
        const rafId = useRef<number | undefined>(undefined);

        const handleMove = useCallback(
            (e: MouseEvent) => {
                e.preventDefault();
                if (rafId.current !== undefined) return;

                rafId.current = window.requestAnimationFrame(() => {
                    const scale = editorEngine.canvas.scale;
                    const deltaX = (e.clientX - dragState.current.startX) / scale;
                    const deltaY = (e.clientY - dragState.current.startY) / scale;

                    editorEngine.frames.updateLocally(frame.id, {
                        ...frame,
                        position: {
                            x: dragState.current.startPos.x + deltaX,
                            y: dragState.current.startPos.y + deltaY,
                        },
                    });
                    rafId.current = undefined;
                });
            },
            [frame, editorEngine],
        );

        const endMove = useCallback(
            (e: MouseEvent) => {
                e.preventDefault();
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', endMove);
                if (rafId.current !== undefined) {
                    cancelAnimationFrame(rafId.current);
                    rafId.current = undefined;
                }

                editorEngine.frames.updateAndSaveToStorage(frame);
            },
            [frame, handleMove],
        );

        const handleMouseDown = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
                e.preventDefault();
                e.stopPropagation();
                editorEngine.elements.clear();
                editorEngine.overlay.clear();

                dragState.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPos: { ...frame.position },
                };

                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', endMove);
            },
            [frame, handleMove],
        );

        // Cleanup event listeners
        useEffect(() => {
            return () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', endMove);
            };
        }, [handleMove, endMove]);

        const handleReload = () => {
            editorEngine.frames.reload(frame.id);
        };

        const handleClick = () => {
            editorEngine.frames.select([frame]);
        };

        return (
            <div
                className={
                    cn(
                        'rounded-lg bg-background-primary/10 hover:shadow h-6 m-auto flex items-center backdrop-blur-lg overflow-hidden relative shadow-sm border-input text-foreground-secondary group-hover:text-foreground cursor-grab active:cursor-grabbing transition-colors duration-200',
                        isSelected && 'text-teal-400 fill-teal-400',
                    )
                }
                style={{
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${10 / editorEngine.canvas.scale}px`,
                    willChange: 'transform',
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div
                    className="flex flex-row items-center justify-between gap-2 w-full"
                    style={{
                        transform: `scale(${1 / editorEngine.canvas.scale})`,
                        transformOrigin: 'left center',
                    }}
                >
                    <Button variant="ghost" size="icon" className="cursor-pointer" onClick={handleReload}>
                        <Icons.Reload />
                    </Button>
                    <div className="text-small overflow-hidden text-ellipsis whitespace-nowrap">
                        {frame.url}
                    </div>
                    <Link className="ml-auto" href={frame.url} target="_blank">
                        <Button variant="ghost" size="icon">
                            <Icons.ExternalLink />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    },
);
