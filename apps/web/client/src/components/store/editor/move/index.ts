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
    isDraggingAbsolute = false;
    isDragInProgress = false;

    constructor(private editorEngine: EditorEngine) {}

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

        if (el.styles?.computed?.position === 'absolute') {
            this.isDraggingAbsolute = true;
            this.editorEngine.history.startTransaction();
            return;
        } else {
            try {
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
    }

    async drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.dragOrigin || !this.dragTarget || !this.isDragInProgress) {
            console.error('Cannot drag without drag origin or target');
            return;
        }

        const frameView = this.editorEngine.frames.get(this.dragTarget.frameId);
        if (!frameView) {
            console.error('No frameView found for drag');
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.dragOrigin.x;
        const dy = y - this.dragOrigin.y;

        if (this.isDraggingAbsolute) {
            await this.handleDragAbsolute(this.dragOrigin, this.dragTarget, x, y);
            return;
        }

        if (Math.max(Math.abs(dx), Math.abs(dy)) > this.MIN_DRAG_DISTANCE) {
            this.editorEngine.overlay.clear();
            try {
                await frameView.view.drag(this.dragTarget.domId, dx, dy, x, y);
            } catch (error) {
                console.error('Error during drag:', error);
            }
        }
    }

    async handleDragAbsolute(
        dragOrigin: ElementPosition,
        dragTarget: DomElement,
        x: number,
        y: number,
    ) {
        const initialOffset = {
            x: dragOrigin.x - dragTarget.rect.x,
            y: dragOrigin.y - dragTarget.rect.y,
        };

        const frameView = this.editorEngine.frames.get(dragTarget.frameId)?.view;
        if (!frameView) {
            console.error('No frameView found for drag');
            return;
        }

        try {
            const offsetParent = (await frameView.getOffsetParent(
                dragTarget.domId,
            )) as DomElement | null;
            if (!offsetParent) {
                console.error('No offset parent found for drag');
                return;
            }

            const parentRect = offsetParent.rect;
            if (!parentRect) {
                console.error('No parent rect found for drag');
                return;
            }

            const newX = Math.round(x - parentRect.x - initialOffset.x);
            const newY = Math.round(y - parentRect.y - initialOffset.y);

            this.editorEngine.overlay.clear();
            this.editorEngine.style.updateMultiple({
                left: `${newX}px`,
                top: `${newY}px`,
                transform: 'none',
            });
        } catch (error) {
            console.error('Error handling absolute drag:', error);
        }
    }

    async end(e: React.MouseEvent<HTMLDivElement>) {
        if (!this.isDragInProgress) {
            this.clear();
            await this.endAllDrag();
            return;
        }

        if (this.isDraggingAbsolute) {
            await this.editorEngine.history.commitTransaction();
            this.isDraggingAbsolute = false;
            this.clear();
            return;
        }

        if (this.originalIndex === undefined || !this.dragTarget) {
            this.clear();
            await this.endAllDrag();
            return;
        }

        const frameView = this.editorEngine.frames.get(this.dragTarget.frameId);
        if (!frameView) {
            console.error('No frameView found for drag end');
            await this.endAllDrag();
            return;
        }

        try {
            const targetDomId = this.dragTarget.domId;
            this.isDragInProgress = false;

            const res = (await frameView.view.endDrag(targetDomId)) as {
                newIndex: number;
                child: DomElement;
                parent: DomElement;
            } | null;

            if (res) {
                const { child, parent, newIndex } = res;
                if (newIndex !== this.originalIndex) {
                    const moveAction = this.createMoveAction(
                        frameView.frame.id,
                        child,
                        parent,
                        newIndex,
                        this.originalIndex,
                    );
                    await this.editorEngine.action.run(moveAction);
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

        this.editorEngine.frames.webviews.forEach((frameView) => {
            try {
                const promise = frameView.view.endAllDrag() as Promise<unknown>;
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
        const frameView = this.editorEngine.frames.get(element.frameId);
        if (!frameView) {
            return;
        }

        try {
            // Get current index and parent
            const currentIndex = (await frameView.view.getElementIndex(element.domId)) as number;

            if (currentIndex === -1) {
                return;
            }

            const parent = (await frameView.view.getParentElement(element.domId)) as DomElement;
            if (!parent) {
                return;
            }

            // Get filtered children count for accurate index calculation
            const childrenCount = (await frameView.view.getChildrenCount(parent.domId)) as number;

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
                frameView.frame.id,
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
        this.isDraggingAbsolute = false;
        this.isDragInProgress = false;
    }
}
