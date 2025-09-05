import { useEditorEngine } from '@/components/store/editor';
import type { Frame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { HoverOnlyTooltip } from '../../../editor-bar/hover-tooltip';
import { BranchDisplay } from './branch';
import { PageSelector } from './page-selector';

export const TopBar = observer(
    ({ frame }: { frame: Frame }) => {
        const editorEngine = useEditorEngine();
        const isSelected = editorEngine.frames.isSelected(frame.id);
        const topBarRef = useRef<HTMLDivElement>(null);
        const toolBarRef = useRef<HTMLDivElement>(null);
        const [shouldShowExternalLink, setShouldShowExternalLink] = useState(true);

        useEffect(() => {
            const calculateVisibility = () => {
                if (!topBarRef.current || !toolBarRef.current || !isSelected) {
                    setShouldShowExternalLink(false);
                    return;
                }

                const topBarWidth = topBarRef.current.clientWidth;
                const toolBarWidth = toolBarRef.current.clientWidth;
                const scale = editorEngine.canvas.scale;

                // Both toolbar and external link are scaled down by (1/scale)
                // So their visual widths are: actualWidth / scale
                const visualToolBarWidth = toolBarWidth / scale;
                const visualExternalLinkWidth = 32 / scale; // Button is ~32px, scaled down
                const padding = 10 / scale; // Some padding between elements, also scaled

                // Calculate if there's enough space for both toolbar and external link
                // Add extra buffer to hide the external link before it gets too cramped
                const totalNeededWidth = visualToolBarWidth + visualExternalLinkWidth + padding;
                const hasEnoughSpace = topBarWidth >= totalNeededWidth;

                setShouldShowExternalLink(hasEnoughSpace);
            };

            // Calculate on mount and when dependencies change
            calculateVisibility();

            // Recalculate when the window resizes or canvas scale changes
            const handleResize = () => calculateVisibility();
            window.addEventListener('resize', handleResize);

            return () => window.removeEventListener('resize', handleResize);
        }, [isSelected, editorEngine.canvas.scale, frame.dimension.width]);

        const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            clearElements();

            const startX = e.clientX;
            const startY = e.clientY;
            const startPositionX = frame.position.x;
            const startPositionY = frame.position.y;

            const handleMove = async (e: MouseEvent) => {
                clearElements();
                const scale = editorEngine.canvas.scale;
                const deltaX = (e.clientX - startX) / scale;
                const deltaY = (e.clientY - startY) / scale;

                let newPosition = {
                    x: startPositionX + deltaX,
                    y: startPositionY + deltaY,
                };

                if (editorEngine.snap.config.enabled && !e.ctrlKey && !e.metaKey) {
                    const snapTarget = editorEngine.snap.calculateSnapTarget(
                        frame.id,
                        newPosition,
                        frame.dimension
                    );

                    if (snapTarget) {
                        newPosition = snapTarget.position;
                        editorEngine.snap.showSnapLines(snapTarget.snapLines);
                    } else {
                        editorEngine.snap.hideSnapLines();
                    }
                } else {
                    editorEngine.snap.hideSnapLines();
                }

                editorEngine.frames.updateAndSaveToStorage(frame.id, { position: newPosition });
            };

            const endMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                editorEngine.snap.hideSnapLines();
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', endMove);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', endMove);
        };

        const clearElements = () => {
            editorEngine.elements.clear();
            editorEngine.overlay.clearUI();
        };

        const handleReload = () => {
            editorEngine.frames.reloadView(frame.id);
        };

        const handleGoBack = async () => {
            await editorEngine.frames.goBack(frame.id);
        };

        const handleGoForward = async () => {
            await editorEngine.frames.goForward(frame.id);
        };

        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            editorEngine.frames.select([frame], e.shiftKey);
        };

        return (
            <div
                ref={topBarRef}
                className={cn(
                    'rounded-lg bg-background-primary/10  hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-lg overflow-hidden relative shadow-sm border-input text-foreground-secondary group-hover:text-foreground cursor-grab active:cursor-grabbing',
                    isSelected && 'text-teal-400 fill-teal-400',
                )}
                style={{
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${4 / editorEngine.canvas.scale}px`,
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div
                    className="flex flex-row items-center"
                    style={{
                        transform: `scale(${1 / editorEngine.canvas.scale})`,
                        transformOrigin: 'left center',
                    }}
                    ref={toolBarRef}
                >
                    <HoverOnlyTooltip content="Hold to drag" side="top" className="mb-1" hideArrow>
                        <div className="cursor-pointer rounded-lg h-auto px-1 py-1 flex items-center justify-center hover:bg-background-secondary -ml-2 opacity-70">
                            <Icons.DragHandleDots />
                        </div>
                    </HoverOnlyTooltip>
                    <HoverOnlyTooltip content="Go back" side="top" className="mb-1" hideArrow>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'cursor-pointer rounded-lg h-auto px-1 py-1',
                                !editorEngine.frames.navigation.canGoBack(frame.id) && 'hidden',
                                !isSelected && 'hidden',
                            )}
                            onClick={handleGoBack}
                            disabled={!editorEngine.frames.navigation.canGoBack(frame.id)}
                        >
                            <Icons.ArrowLeft />
                        </Button>
                    </HoverOnlyTooltip>
                    <HoverOnlyTooltip content="Go forward" side="top" className="mb-1" hideArrow>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'cursor-pointer rounded-lg h-auto px-1 py-1',
                                !editorEngine.frames.navigation.canGoForward(frame.id) && 'hidden',
                                !isSelected && 'hidden',
                            )}
                            onClick={handleGoForward}
                            disabled={!editorEngine.frames.navigation.canGoForward(frame.id)}
                        >
                            <Icons.ArrowRight />
                        </Button>
                    </HoverOnlyTooltip>
                    <HoverOnlyTooltip content="Refresh Page" side="top" className="mb-1" hideArrow>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'cursor-pointer rounded-lg h-auto px-1 py-1',
                                !isSelected && 'hidden',
                            )}
                            onClick={handleReload}
                        >
                            <Icons.Reload />
                        </Button>
                    </HoverOnlyTooltip>
                    <BranchDisplay frame={frame} />
                    <PageSelector frame={frame} />
                </div>
                <HoverOnlyTooltip content="Preview in new tab" side="top" hideArrow className="mb-1">
                    <Link
                        className={cn(
                            'absolute right-1 top-1/2 -translate-y-1/2 transition-opacity duration-300',
                        )}
                        href={frame.url.replace(/\[([^\]]+)\]/g, 'temp-$1')} // Dynamic routes are not supported so we replace them with a temporary value
                        target="_blank"
                        style={{
                            transform: `scale(${1 / editorEngine.canvas.scale})`,
                            transformOrigin: 'right center',
                            opacity: shouldShowExternalLink ? 1 : 0,
                            pointerEvents: shouldShowExternalLink ? 'auto' : 'none',
                        }}
                    >
                        <Button variant="ghost" size="icon" className="rounded-lg">
                            <Icons.ExternalLink />
                        </Button>
                    </Link>
                </HoverOnlyTooltip>
            </div>
        );
    });
