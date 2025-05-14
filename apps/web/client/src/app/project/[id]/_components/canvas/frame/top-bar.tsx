import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';

export const TopBar = observer(
    ({ frame, children }: { frame: WebFrame; children?: React.ReactNode }) => {
        const editorEngine = useEditorEngine();

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
                editorEngine.canvas.saveFrame(frame.id, frame);
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
            editorEngine.frames.reload(frame.id);
        };

        return (
            <div
                className="rounded-lg bg-background-primary/10 hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-lg overflow-hidden relative shadow-sm border-input text-foreground-secondary group-hover:text-foreground cursor-grab active:cursor-grabbing"
                style={{
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${10 / editorEngine.canvas.scale}px`,
                }}
                onMouseDown={handleMouseDown}
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
