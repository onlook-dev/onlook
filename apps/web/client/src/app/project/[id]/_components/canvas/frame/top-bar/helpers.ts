import type { EditorEngine } from '@/components/store/editor/engine';
import type { Frame } from '@onlook/models';

export interface MouseMoveHandlerOptions {
    editorEngine: EditorEngine;
    selectedFrames: Frame[];
    clearElements: () => void;
}

export function createMouseMoveHandler(
    startEvent: React.MouseEvent<HTMLDivElement, MouseEvent>,
    options: MouseMoveHandlerOptions
) {
    const { editorEngine, selectedFrames, clearElements } = options;

    startEvent.preventDefault();
    startEvent.stopPropagation();
    clearElements();

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    let isDragActive = false;

    // Store initial positions for all selected frames
    const initialFramePositions = selectedFrames.map(frame => ({
        id: frame.id,
        startPosition: { x: frame.position.x, y: frame.position.y },
        dimension: frame.dimension
    }));

    const handleMove = async (e: MouseEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // Check deadzone - only start dragging after 5px movement
        if (!isDragActive) {
            if (dx * dx + dy * dy <= 25) {
                return; // Still within deadzone
            }
            isDragActive = true;
            clearElements();
        }

        const scale = editorEngine.canvas.scale;
        const deltaX = dx / scale;
        const deltaY = dy / scale;

        // Update all selected frames
        for (const frameData of initialFramePositions) {
            let newPosition = {
                x: frameData.startPosition.x + deltaX,
                y: frameData.startPosition.y + deltaY,
            };

            // Apply snapping if enabled (only for the primary frame to avoid conflicts)
            if (editorEngine.snap.config.enabled && !e.ctrlKey && !e.metaKey && frameData === initialFramePositions[0]) {
                const snapTarget = editorEngine.snap.calculateSnapTarget(
                    frameData.id,
                    newPosition,
                    frameData.dimension
                );

                if (snapTarget) {
                    // Apply the snap offset to all frames
                    const snapDeltaX = snapTarget.position.x - newPosition.x;
                    const snapDeltaY = snapTarget.position.y - newPosition.y;

                    for (const otherFrameData of initialFramePositions) {
                        const adjustedPosition = {
                            x: otherFrameData.startPosition.x + deltaX + snapDeltaX,
                            y: otherFrameData.startPosition.y + deltaY + snapDeltaY,
                        };
                        editorEngine.frames.updateAndSaveToStorage(otherFrameData.id, { position: adjustedPosition });
                    }

                    editorEngine.snap.showSnapLines(snapTarget.snapLines);
                    return;
                } else {
                    editorEngine.snap.hideSnapLines();
                }
            } else if (frameData === initialFramePositions[0]) {
                editorEngine.snap.hideSnapLines();
            }

            editorEngine.frames.updateAndSaveToStorage(frameData.id, { position: newPosition });
        }
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
}