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
            return;
        }

        const webview = this.editorEngine.webviews.getWebview(this.dragTarget.webviewId);
        if (!webview) {
            console.error('No webview found for drag end');
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

    async moveLayerVertically(element: DomElement, direction: 'up' | 'down'): Promise<void> {
        const webview = this.editorEngine.webviews.getWebview(element.webviewId);
        if (!webview) {
            console.error('No webview found for element:', element);
            return;
        }

        console.log('Moving layer:', { direction, element });

        const currentIndex = await webview.executeJavaScript(
            `window.api?.getElementIndex('${element.domId}')`,
        );
        console.log('Current index:', currentIndex);

        if (currentIndex === -1) {
            console.error('Invalid current index');
            return;
        }

        const parent = await webview.executeJavaScript(
            `window.api?.getParentElement('${element.domId}')`,
        );
        console.log('Parent element:', parent);

        if (!parent) {
            console.error('No parent element found');
            return;
        }

        const displayDirection = await webview.executeJavaScript(
            `window.api?.getDisplayDirection('${parent.domId}')`,
        );
        console.log('Display direction:', displayDirection);

        const childrenCount = await webview.executeJavaScript(
            `window.api?.getChildrenCount('${element.domId}')`,
        );
        console.log('Children count:', childrenCount);

        const newIndex =
            direction === 'up'
                ? Math.max(0, currentIndex - 1)
                : Math.min(childrenCount - 1, currentIndex + 1);
        console.log('New index:', newIndex, 'Total children:', childrenCount);

        if (newIndex === currentIndex) {
            console.log('No movement needed - already at boundary');
            return;
        }

        const moveAction = this.createMoveAction(
            webview.id,
            element,
            parent,
            newIndex,
            currentIndex,
        );

        this.editorEngine.action.run(moveAction);
    }
}
