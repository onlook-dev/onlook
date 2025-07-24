import type { DomElement, ElementPosition } from '@onlook/models';
import type { MoveElementAction } from '@onlook/models/actions';
import type React from 'react';
import type { EditorEngine } from '../engine';
import type { FrameData } from '../frames';

export class MoveManager {
    dragOrigin: ElementPosition | undefined;
    dragTarget: DomElement | undefined;
    originalIndex: number | undefined;
    MIN_DRAG_DISTANCE = 5;
    isDragInProgress = false;

    constructor(private editorEngine: EditorEngine) { }

    get isDragging() {
        return !!this.dragOrigin;
    }

    async start(el: DomElement, position: ElementPosition, frameView: FrameData) {
        if (!this.editorEngine.elements.selected.some((selected) => selected.domId === el.domId)) {
            console.warn('Element not selected, cannot start drag');
            return;
        }

        this.dragOrigin = position;
        this.dragTarget = el;
        this.isDragInProgress = true;

        try {
            if (!frameView.view) {
                console.error('No frame view found');
                return;
            }

            const index = (await frameView.view.startDrag(el.domId)) as number;
            if (index === null || index === -1) {
                this.clear();
                this.isDragInProgress = false;
                console.warn('Start drag failed, original index is null or -1');
                return;
            }
            this.originalIndex = index;
        } catch (error) {
            console.error('Error starting drag:', error);
            this.clear();
            this.isDragInProgress = false;
        }
    }

    async drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.dragOrigin || !this.dragTarget || !this.isDragInProgress) {
            console.error('Cannot drag without drag origin or target');
            return;
        }

        const frameData = this.editorEngine.frames.get(this.dragTarget.frameId);
        if (!frameData?.view) {
            console.error('No frameView found for drag');
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.dragOrigin.x;
        const dy = y - this.dragOrigin.y;

        if (Math.max(Math.abs(dx), Math.abs(dy)) > this.MIN_DRAG_DISTANCE) {
            this.editorEngine.overlay.clear();
            try {
                const positionType = this.dragTarget.styles?.computed?.position;
                if (positionType === 'absolute') {
                    await frameData.view.dragAbsolute(this.dragTarget.domId, x, y, this.dragOrigin);
                } else {
                    await frameData.view.drag(this.dragTarget.domId, dx, dy, x, y);
                }
            } catch (error) {
                console.error('Error during drag:', error);
            }
        }
    }

    async end(e: React.MouseEvent<HTMLDivElement>) {
        if (!this.dragTarget) {
            this.clear();
            await this.endAllDrag();
            return;
        }

        const frameData = this.editorEngine.frames.get(this.dragTarget.frameId);
        if (!frameData?.view) {
            console.error('No frameView found for drag end');
            await this.endAllDrag();
            return;
        }

        if (!this.isDragInProgress) {
            this.clear();
            await this.endAllDrag();
            return;
        }

        try {
            const targetDomId = this.dragTarget.domId;
            this.isDragInProgress = false;

            // Handle absolute positioning
            const position = this.dragTarget.styles?.computed?.position;
            if (position === ('absolute' as const)) {
                const res = await frameData.view.endDragAbsolute(targetDomId);

                if (res) {
                    const { left, top } = res;
                    await this.editorEngine.style.updateMultiple({
                        left: left,
                        top: top,
                        transform: 'none',
                    });
                }
            } else {
                // Handle regular drag with index changes
                const res = (await frameData.view.endDrag(targetDomId)) as {
                    newIndex: number;
                    child: DomElement;
                    parent: DomElement;
                } | null;

                if (res && this.originalIndex !== undefined) {
                    const { child, parent, newIndex } = res;
                    if (newIndex !== this.originalIndex) {
                        const moveAction = this.createMoveAction(
                            frameData.frame.id,
                            child,
                            parent,
                            newIndex,
                            this.originalIndex,
                        );
                        await this.editorEngine.action.run(moveAction);
                    }
                }
            }
        } catch (error) {
            console.error('Error ending drag:', error);
            await this.endAllDrag();
        } finally {
            this.clear();
        }
    }

    async endAllDrag() {
        const promises: Promise<unknown>[] = [];

        this.editorEngine.frames.getAll().forEach((frameData) => {
            try {
                if (!frameData.view) {
                    console.error('No frame view found');
                    return;
                }
                const promise = frameData.view.endAllDrag() as Promise<unknown>;
                promises.push(promise);
            } catch (error) {
                console.error('Error in endAllDrag:', error);
            }
        });

        await Promise.all(promises);
    }

    async moveSelected(direction: 'up' | 'down') {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 1 && selected[0]) {
            await this.shiftElement(selected[0], direction);
        } else {
            if (selected.length > 1) {
                console.error('Multiple elements selected, cannot shift');
            } else {
                console.error('No elements selected, cannot shift');
            }
        }
    }

    async shiftElement(element: DomElement, direction: 'up' | 'down'): Promise<void> {
        const frameData = this.editorEngine.frames.get(element.frameId);
        if (!frameData?.view) {
            return;
        }

        try {
            // Get current index and parent
            const currentIndex = (await frameData.view.getElementIndex(element.domId)) as number;

            if (currentIndex === -1) {
                return;
            }

            const parent = (await frameData.view.getParentElement(element.domId)) as DomElement;
            if (!parent) {
                return;
            }

            // Get filtered children count for accurate index calculation
            const childrenCount = (await frameData.view.getChildrenCount(parent.domId)) as number;

            // Calculate new index based on direction and bounds
            const newIndex =
                direction === 'up'
                    ? Math.max(0, currentIndex - 1)
                    : Math.min(childrenCount - 1, currentIndex + 1);

            if (newIndex === currentIndex) {
                return;
            }

            // Create and run move action
            const moveAction = this.createMoveAction(
                frameData.frame.id,
                element,
                parent,
                newIndex,
                currentIndex,
            );

            await this.editorEngine.action.run(moveAction);
        } catch (error) {
            console.error('Error shifting element:', error);
        }
    }

    createMoveAction(
        frameId: string,
        child: DomElement,
        parent: DomElement,
        newIndex: number,
        originalIndex: number,
    ): MoveElementAction {
        return {
            type: 'move-element',
            location: {
                type: 'index',
                targetDomId: parent.domId,
                targetOid: parent.instanceId ?? parent.oid,
                index: newIndex,
                originalIndex: originalIndex,
            },
            targets: [
                {
                    frameId: frameId,
                    domId: child.domId,
                    oid: child.instanceId ?? child.oid,
                },
            ],
        };
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
        this.dragTarget = undefined;
        this.isDragInProgress = false;
    }
}
