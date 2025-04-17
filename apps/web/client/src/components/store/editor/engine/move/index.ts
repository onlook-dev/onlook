import type { DomElement, ElementPosition } from '@onlook/models';
import type { MoveElementAction } from '@onlook/models/actions';
import type React from 'react';
import type { EditorEngine } from '..';

export class MoveManager {
    dragOrigin: ElementPosition | undefined;
    dragTarget: DomElement | undefined;
    originalIndex: number | undefined;
    MIN_DRAG_DISTANCE = 5;
    isDraggingAbsolute = false;

    constructor(private editorEngine: EditorEngine) { }

    get isDragging() {
        return !!this.dragOrigin;
    }

    async start(el: DomElement, position: ElementPosition, frameView: Electron.WebviewTag) {
        if (this.editorEngine.chat.isWaiting) {
            return;
        }
        if (!this.editorEngine.elements.selected.some((selected) => selected.domId === el.domId)) {
            console.warn('Element not selected, cannot start drag');
            return;
        }

        this.dragOrigin = position;
        this.dragTarget = el;
        if (el.styles?.computed?.position === 'absolute') {
            this.isDraggingAbsolute = true;
            this.editorEngine.history.startTransaction();
            return;
        } else {
            this.originalIndex = await frameView.executeJavaScript(
                `window.api?.startDrag('${el.domId}')`,
            );
        }

        if (this.originalIndex === null || this.originalIndex === -1) {
            this.clear();
            console.warn('Start drag failed, original index is null or -1');
            return;
        }
    }

    async drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.dragOrigin || !this.dragTarget) {
            console.error('Cannot drag without drag origin or target');
            return;
        }

        const frameView = this.editorEngine.frames.getWebview(this.dragTarget.frameId);
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
            frameView.executeJavaScript(
                `window.api?.drag('${this.dragTarget.domId}', ${dx}, ${dy}, ${x}, ${y})`,
            );
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

        const offsetParent = await frameView.executeJavaScript(
            `window.api?.getOffsetParent('${dragTarget.domId}')`,
        );
        if (!offsetParent) {
            console.error('No offset parent found for drag');
            return;
        }
        const parentRect = offsetParent.rect;

        const newX = Math.round(x - parentRect.x - initialOffset.x);
        const newY = Math.round(y - parentRect.y - initialOffset.y);

        this.editorEngine.overlay.clear();
        this.editorEngine.style.updateMultiple({
            left: `${newX}px`,
            top: `${newY}px`,
        });
    }

    async end(e: React.MouseEvent<HTMLDivElement>) {
        if (this.isDraggingAbsolute) {
            this.editorEngine.history.commitTransaction();
            this.isDraggingAbsolute = false;
            this.clear();
        }

        if (this.originalIndex === undefined || !this.dragTarget) {
            this.clear();
            this.endAllDrag();
            return;
        }

        const frameView = this.editorEngine.frames.getWebview(this.dragTarget.frameId);
        if (!frameView) {
            console.error('No frameView found for drag end');
            this.endAllDrag();
            return;
        }

        const res: {
            newIndex: number;
            child: DomElement;
            parent: DomElement;
        } | null = await frameView.executeJavaScript(
            `window.api?.endDrag('${this.dragTarget.domId}')`,
        );

        if (res) {
            const { child, parent, newIndex } = res;
            if (newIndex !== this.originalIndex) {
                const moveAction = this.createMoveAction(
                    frameView.id,
                    child,
                    parent,
                    newIndex,
                    this.originalIndex,
                );
                this.editorEngine.action.run(moveAction);
            }
        }
        this.clear();
    }

    endAllDrag() {
        this.editorEngine.frames.webviews.forEach((frameView) => {
            frameView.frameView.executeJavaScript(`window.api?.endAllDrag()`);
        });
    }

    moveSelected(direction: 'up' | 'down') {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 1) {
            this.shiftElement(selected[0], direction);
        } else {
            if (selected.length > 1) {
                console.error('Multiple elements selected, cannot shift');
            } else {
                console.error('No elements selected, cannot shift');
            }
        }
    }

    async shiftElement(element: DomElement, direction: 'up' | 'down'): Promise<void> {
        const frameView = this.editorEngine.frames.getWebview(element.frameId);
        if (!frameView) {
            return;
        }

        // Get current index and parent
        const currentIndex = await frameView.executeJavaScript(
            `window.api?.getElementIndex('${element.domId}')`,
        );

        if (currentIndex === -1) {
            return;
        }

        const parent: DomElement | null = await frameView.executeJavaScript(
            `window.api?.getParentElement('${element.domId}')`,
        );
        if (!parent) {
            return;
        }

        // Get filtered children count for accurate index calculation
        const childrenCount = await frameView.executeJavaScript(
            `window.api?.getChildrenCount('${parent.domId}')`,
        );

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
            frameView.id,
            element,
            parent,
            newIndex,
            currentIndex,
        );

        this.editorEngine.action.run(moveAction);
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
                targetOid: parent.instanceId || parent.oid,
                index: newIndex,
                originalIndex: originalIndex,
            },
            targets: [
                {
                    frameId: frameId,
                    domId: child.domId,
                    oid: child.instanceId || child.oid,
                },
            ],
        };
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
        this.dragTarget = undefined;
    }

    dispose() {
        // Clear state
        this.clear();

        // Clear references
        this.editorEngine = null as any;
    }
}
