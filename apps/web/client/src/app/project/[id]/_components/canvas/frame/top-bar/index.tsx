import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { observer } from 'mobx-react-lite';

import type { Frame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { HoverOnlyTooltip } from '../../../editor-bar/hover-tooltip';
import { BranchDisplay } from './branch';
import { createMouseMoveHandler } from './helpers';
import { PageSelector } from './page-selector';

export const TopBar = observer(
    ({ frame, isInDragSelection = false }: { frame: Frame; isInDragSelection?: boolean }) => {
        const editorEngine = useEditorEngine();
        const isSelected = editorEngine.frames.isSelected(frame.id);
        const topBarRef = useRef<HTMLDivElement>(null);
        const toolBarRef = useRef<HTMLDivElement>(null);
        const [shouldShowExternalLink, setShouldShowExternalLink] = useState(true);
        const mouseDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

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
            mouseDownRef.current = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now(),
            };

            const selectedFrames = editorEngine.frames.selected.map((frameData) => frameData.frame);
            const framesToMove = selectedFrames.length > 0 ? selectedFrames : [frame];

            createMouseMoveHandler(e, {
                editorEngine,
                selectedFrames: framesToMove,
                clearElements,
            });
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
            if (!mouseDownRef.current) {
                return;
            }

            const currentTime = Date.now();
            const timeDiff = currentTime - mouseDownRef.current.time;
            const distance = Math.sqrt(
                Math.pow(e.clientX - mouseDownRef.current.x, 2) +
                    Math.pow(e.clientY - mouseDownRef.current.y, 2),
            );

            // Don't register click if it was a long hold (>200ms) or significant movement (>5px)
            if (timeDiff > 200 || distance > 5) {
                mouseDownRef.current = null;
                return;
            }

            mouseDownRef.current = null;
            editorEngine.frames.select([frame], e.shiftKey);
        };

        return (
            <div
                ref={topBarRef}
                className={cn(
                    'border-input text-foreground-secondary group-hover:text-foreground relative m-auto flex cursor-grab flex-row items-center overflow-hidden bg-blend-multiply shadow-sm backdrop-blur-lg hover:shadow active:cursor-grabbing',
                    isSelected && 'fill-teal-400 text-teal-400',
                    !isSelected && isInDragSelection && 'fill-teal-500 text-teal-500',
                )}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    ...(isSelected && { backgroundColor: 'rgba(20, 184, 166, 0.1)' }),
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${8 / editorEngine.canvas.scale}px`,
                    borderRadius: `${8 / editorEngine.canvas.scale}px`,
                    paddingTop: `${16 / editorEngine.canvas.scale}px`,
                    paddingBottom: `${16 / editorEngine.canvas.scale}px`,
                    paddingLeft: `${4 / editorEngine.canvas.scale}px`,
                    paddingRight: `${4 / editorEngine.canvas.scale}px`,
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
                    <HoverOnlyTooltip content="Go back" side="top" className="mb-1" hideArrow>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-auto cursor-pointer rounded-lg px-1 py-1 hover:!bg-transparent focus:!bg-transparent active:!bg-transparent',
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
                                'h-auto cursor-pointer rounded-lg px-1 py-1 hover:!bg-transparent focus:!bg-transparent active:!bg-transparent',
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
                                'h-auto cursor-pointer rounded-lg hover:!bg-transparent focus:!bg-transparent active:!bg-transparent',
                                !isSelected && 'hidden',
                            )}
                            onClick={handleReload}
                        >
                            <Icons.Reload />
                        </Button>
                    </HoverOnlyTooltip>
                    <BranchDisplay frame={frame} />
                    <span
                        className={cn(
                            'mb-0.5 ml-1.25',
                            isSelected ? 'text-teal-700' : 'text-foreground-secondary/50',
                        )}
                    >
                        ·
                    </span>
                    <PageSelector frame={frame} />
                </div>
                <HoverOnlyTooltip
                    content="Preview in new tab"
                    side="top"
                    hideArrow
                    className="mb-1"
                >
                    <Link
                        className={cn(
                            'absolute top-1/2 right-1 -translate-y-1/2 transition-opacity duration-300',
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-lg hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
                        >
                            <Icons.ExternalLink />
                        </Button>
                    </Link>
                </HoverOnlyTooltip>
            </div>
        );
    },
);
