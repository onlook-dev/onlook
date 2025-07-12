'use client';

import { useEditorEngine } from '@/components/store/editor';
import { type Frame } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import throttle from 'lodash/throttle';
import { Scan } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';

export const RecenterCanvasButton = observer(() => {
    const editorEngine = useEditorEngine();

    const frames = editorEngine.frames.getAll();

    const throttledViewportCheck = useCallback(
        throttle(
            () => {
                function isFrameInViewport(frame: Frame): boolean {
                    const canvasPos = editorEngine.canvas.position;
                    const canvasScale = editorEngine.canvas.scale;

                    const screenX = canvasPos.x + frame.position.x * canvasScale;
                    const screenY = canvasPos.y + frame.position.y * canvasScale;
                    const screenWidth = frame.dimension.width * canvasScale;
                    const screenHeight = frame.dimension.height * canvasScale;

                    return !(
                        screenX + screenWidth < 0 ||
                        screenX > window.innerWidth ||
                        screenY + screenHeight < 0 ||
                        screenY > window.innerHeight
                    );
                }

                return !editorEngine.frames
                    .getAll()
                    .some((frame) => isFrameInViewport(frame.frame));
            },
            200,
            { leading: true, trailing: true },
        ),
        [editorEngine],
    );

    const isCanvasOutOfView = useMemo(
        () => throttledViewportCheck(),
        [throttledViewportCheck, editorEngine.canvas.position, editorEngine.canvas.scale, frames],
    );

    useEffect(() => {
        return () => throttledViewportCheck.cancel();
    }, [throttledViewportCheck]);

    const handleRecenterCanvas = () => {
        const firstFrame = frames[0]?.frame;

        if (firstFrame) {
            const canvasScale = editorEngine.canvas.scale;

            const frameCenterX = firstFrame.position.x + firstFrame.dimension.width / 2;
            const frameCenterY = firstFrame.position.y + firstFrame.dimension.height / 2;

            const defaultPosition = editorEngine.canvas.getDefaultPanPosition();
            const viewportCenterX = window.innerWidth / 2 - defaultPosition.x;
            const viewportCenterY = window.innerHeight / 2 - defaultPosition.y;

            editorEngine.canvas.position = {
                x: viewportCenterX - frameCenterX * canvasScale,
                y: viewportCenterY - frameCenterY * canvasScale,
            };
        } else {
            editorEngine.canvas.position = editorEngine.canvas.getDefaultPanPosition();
        }
    };

    if (!isCanvasOutOfView) return null;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-foreground-secondary mb-2">Your canvas is out of view</p>
            <Button onClick={handleRecenterCanvas}>
                <Scan className="size-4" />
                <span>Re-Center the Canvas</span>
            </Button>
        </div>
    );
});
