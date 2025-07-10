import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useRef } from 'react';
import { HoverOnlyTooltip } from '../../editor-bar/hover-tooltip';

export const TopBar = observer(
    ({ frame }: { frame: WebFrame }) => {
        const editorEngine = useEditorEngine();
        const isSelected = editorEngine.frames.isSelected(frame.id);
        const topBarRef = useRef<HTMLDivElement>(null);
        const urlRef = useRef<HTMLDivElement>(null);
        const topBarWidth = (topBarRef.current?.clientWidth ?? 0);
        const urlWidth = (urlRef.current?.clientWidth ?? 0);
        const shouldShowExternalLink = ((topBarWidth - urlWidth) * editorEngine.canvas.scale) > 250;

        const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            clearElements();

            const startX = e.clientX;
            const startY = e.clientY;
            const startPositionX = frame.position.x;
            const startPositionY = frame.position.y;

            const handleMove = (e: MouseEvent) => {
                const scale = editorEngine.canvas.scale;
                const deltaX = (e.clientX - startX) / scale;
                const deltaY = (e.clientY - startY) / scale;

                const newPosition = {
                    x: startPositionX + deltaX,
                    y: startPositionY + deltaY,
                };

                editorEngine.frames.updateAndSaveToStorage(frame.id, { position: newPosition });
            };

            const endMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', endMove);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', endMove);
        };

        const clearElements = () => {
            editorEngine.elements.clear();
            editorEngine.overlay.clear();
        };

        const handleReload = () => {
            editorEngine.frames.reloadView(frame.id);
        };

        const handleClick = () => {
            editorEngine.frames.select([frame]);
        };

        return (
            <div
                ref={topBarRef}
                className={
                    cn(
                        'rounded-lg bg-background-primary/10 hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-lg overflow-hidden relative shadow-sm border-input text-foreground-secondary group-hover:text-foreground cursor-grab active:cursor-grabbing',
                        isSelected && 'text-teal-400 fill-teal-400',
                    )
                }
                style={{
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${10 / editorEngine.canvas.scale}px`,
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div
                    className="flex flex-row items-center gap-2"
                    style={{
                        transform: `scale(${1 / editorEngine.canvas.scale})`,
                        transformOrigin: 'left center',
                    }}
                >
                    <HoverOnlyTooltip
                        content="Refresh Page"
                        side="top"
                        className='mb-1'
                        hideArrow
                    >
                        <Button variant="ghost" size="icon" className="cursor-pointer" onClick={handleReload}>
                            <Icons.Reload />
                        </Button>
                    </HoverOnlyTooltip>

                        <div
                            ref={urlRef}
                            className="text-small overflow-hidden text-ellipsis whitespace-nowrap">
                            {frame.url}
                        </div>
                </div>
                <HoverOnlyTooltip
                    content="Preview in new tab"
                    side="top"
                    hideArrow
                    className='mb-1'
                >
                <Link
                    className="absolute right-1 top-1/2 -translate-y-1/2 transition-opacity duration-300"
                    href={frame.url}
                    target="_blank"
                    style={{
                        transform: `scale(${1 / editorEngine.canvas.scale})`,
                        transformOrigin: 'right center',
                        opacity: shouldShowExternalLink ? 1 : 0,
                        pointerEvents: shouldShowExternalLink ? 'auto' : 'none',
                    }}
                >
                    <Button variant="ghost" size="icon">
                        <Icons.ExternalLink />
                    </Button>
                </Link>
                </HoverOnlyTooltip>

            </div>
        );
    },
);

