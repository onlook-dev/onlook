import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';

export const TopBar = observer(
    ({ frame }: { frame: WebFrame }) => {
        const editorEngine = useEditorEngine();
        const isSelected = editorEngine.frames.isSelected(frame.id);

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

                frame.position = {
                    x: startPositionX + deltaX,
                    y: startPositionY + deltaY,
                };

                editorEngine.frames.updateLocally(frame.id, frame);
            };

            const endMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const moved = deltaX !== 0 || deltaY !== 0;
                if (moved) {
                    editorEngine.frames.updateAndSaveToStorage(frame);
                }
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
            editorEngine.frames.reload(frame.id);
        };

        const handleClick = () => {
            editorEngine.frames.select([frame]);
        };

        const scale = editorEngine.canvas.scale;
        const shouldScale = scale > 0.7;

        return (
            <div
                className={
                    cn(
                        'rounded-lg bg-background-primary/10 hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-lg overflow-visible relative shadow-sm border-input text-foreground-secondary group-hover:text-foreground cursor-grab active:cursor-grabbing',
                        isSelected && 'text-teal-400 fill-teal-400',
                    )
                }
                style={{
                    height: `${28 / scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${10 / scale}px`,
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div
                    className="absolute top-0 bottom-0 flex items-center z-10"
                    style={{
                        left: shouldScale ? `${4 * (1 / scale)}px` : `${4 * (1 / 0.7)}px`,
                        transform: shouldScale 
                            ? `scale(${1 / scale})` 
                            : 'scale(1.43)',
                        transformOrigin: 'left center',
                    }}
                >
                    <Button variant="ghost" size="icon" className="cursor-pointer" onClick={handleReload}>
                        <Icons.Reload />
                    </Button>
                </div>

                <div
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{
                        left: shouldScale ? `${40 / scale}px` : `${40 / 0.7}px`,
                        transform: shouldScale ? `scale(${1 / scale})` : 'scale(1.43)',
                        transformOrigin: 'left center',
                    }}
                >
                    <div className="text-small overflow-hidden text-ellipsis whitespace-nowrap">
                        {frame.url}
                    </div>
                </div>

                <div
                    className="absolute top-0 bottom-0 flex items-center z-10"
                    style={{
                        right: shouldScale ? `${4 * (1 / scale)}px` : `${4 * (1 / 0.7)}px`,
                        transform: shouldScale 
                            ? `scale(${1 / scale})` 
                            : 'scale(1.43)',
                        transformOrigin: 'right center',
                    }}
                >
                    <Link href={frame.url} target="_blank">
                        <Button variant="ghost" size="icon">
                            <Icons.ExternalLink />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    },
);
