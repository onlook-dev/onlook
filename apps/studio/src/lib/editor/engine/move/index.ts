import type { MoveElementAction } from '@onlook/models/actions';
import { InsertPos } from '@onlook/models/editor';
import type { DomElement, ElementPosition } from '@onlook/models/element';
import type React from 'react';
import type { EditorEngine } from '..';

export class MoveManager {
    dragOrigin: ElementPosition | undefined;
    originalIndex: number | undefined;
    MIN_DRAG_DISTANCE = 15;

    constructor(private editorEngine: EditorEngine) {}

    get isDragging() {
        return !!this.dragOrigin;
    }

    async start(el: DomElement, position: ElementPosition, webview: Electron.WebviewTag) {
        this.dragOrigin = position;
        this.originalIndex = await webview.executeJavaScript(
            `window.api?.startDrag('${el.domId}')`,
        );

        if (this.originalIndex === undefined || this.originalIndex === -1) {
            this.clear();
            return;
        }
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.dragOrigin || !webview) {
            console.error('Cannot drag without drag origin or webview');
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.dragOrigin.x;
        const dy = y - this.dragOrigin.y;

        if (Math.max(Math.abs(dx), Math.abs(dy)) > this.MIN_DRAG_DISTANCE) {
            this.editorEngine.overlay.clear();
            webview.executeJavaScript(`window.api?.drag(${dx}, ${dy}, ${x}, ${y})`);
        }
    }

    async end(e: React.MouseEvent<HTMLDivElement>, webview: Electron.WebviewTag | null) {
        if (this.originalIndex === undefined || !webview) {
            this.clear();
            return;
        }

        const res:
            | {
                  newIndex: number;
                  child: DomElement;
                  parent: DomElement;
              }
            | undefined = await webview.executeJavaScript(`window.api?.endDrag()`);

        if (res) {
            const { newIndex, child, parent } = res;
            if (newIndex !== this.originalIndex) {
                const moveAction = this.createMoveAction(
                    webview.id,
                    child,
                    parent,
                    this.originalIndex,
                    newIndex,
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
        originalIndex: number,
        newIndex: number,
    ): MoveElementAction {
        return {
            type: 'move-element',
            location: {
                position: InsertPos.INDEX,
                targetDomId: parent.domId,
                targetOid: parent.oid,
                index: newIndex,
                originalIndex,
            },
            targets: [
                {
                    webviewId,
                    domId: child.domId,
                    oid: child.oid,
                },
            ],
        };
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
    }
}
