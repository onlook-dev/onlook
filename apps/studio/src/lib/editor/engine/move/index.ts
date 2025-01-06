import type { MoveElementAction } from '@onlook/models/actions';
import type { DomElement, ElementPosition } from '@onlook/models/element';
import type React from 'react';
import type { EditorEngine } from '..';

export class MoveManager {
    dragOrigin: ElementPosition | undefined;
    dragTarget: DomElement | undefined;
    originalIndex: number | undefined;
    MIN_DRAG_DISTANCE = 15;

    constructor(private editorEngine: EditorEngine) {}

    get isDragging() {
        return !!this.dragOrigin;
    }

    async start(el: DomElement, position: ElementPosition, webview: Electron.WebviewTag) {
        this.dragOrigin = position;
        this.dragTarget = el;
        this.originalIndex = await webview.executeJavaScript(
            `window.api?.startDrag('${el.domId}')`,
        );

        if (this.originalIndex === null || this.originalIndex === -1) {
            this.clear();
            console.error('Start drag failed, original index is null or -1');
            return;
        }
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.dragOrigin || !this.dragTarget) {
            console.error('Cannot drag without drag origin or target');
            return;
        }

        const webview = this.editorEngine.webviews.getWebview(this.dragTarget.webviewId);
        if (!webview) {
            console.error('No webview found for drag');
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.dragOrigin.x;
        const dy = y - this.dragOrigin.y;

        if (Math.max(Math.abs(dx), Math.abs(dy)) > this.MIN_DRAG_DISTANCE) {
            this.editorEngine.overlay.clear();
            webview.executeJavaScript(
                `window.api?.drag('${this.dragTarget.domId}', ${dx}, ${dy}, ${x}, ${y})`,
            );
        }
    }

    async end(e: React.MouseEvent<HTMLDivElement>) {
        if (this.originalIndex === undefined || !this.dragTarget) {
            this.clear();
            this.endAllDrag();
            return;
        }

        const webview = this.editorEngine.webviews.getWebview(this.dragTarget.webviewId);
        if (!webview) {
            console.error('No webview found for drag end');
            this.endAllDrag();
            return;
        }

        const res: {
            newIndex: number;
            child: DomElement;
            parent: DomElement;
        } | null = await webview.executeJavaScript(
            `window.api?.endDrag('${this.dragTarget.domId}')`,
        );

        if (res) {
            const { newIndex, child, parent } = res;
            if (newIndex !== this.originalIndex) {
                const moveAction = this.createMoveAction(
                    webview.id,
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
        this.editorEngine.webviews.webviews.forEach((webview) => {
            webview.webview.executeJavaScript(`window.api?.endAllDrag()`);
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
        const webview = this.editorEngine.webviews.getWebview(element.webviewId);
        if (!webview) {
            return;
        }

        // Get current index and parent
        const currentIndex = await webview.executeJavaScript(
            `window.api?.getElementIndex('${element.domId}')`,
        );

        if (currentIndex === -1) {
            return;
        }

        const parent: DomElement | null = await webview.executeJavaScript(
            `window.api?.getParentElement('${element.domId}')`,
        );
        if (!parent) {
            return;
        }

        // Get filtered children count for accurate index calculation
        const childrenCount = await webview.executeJavaScript(
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
            webview.id,
            element,
            parent,
            newIndex,
            currentIndex,
        );

        this.editorEngine.action.run(moveAction);
    }

    createMoveAction(
        webviewId: string,
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
                    webviewId,
                    domId: child.domId,
                    oid: child.instanceId || child.oid,
                },
            ],
        };
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
    }
}
