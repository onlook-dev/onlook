import type React from 'react';
import type { EditorEngine } from '..';
import { escapeSelector } from '/common/helpers';
import { InsertPos } from '@onlook/models/editor';
import type { MoveElementAction } from '@onlook/models/actions';
import type { DomElement, ElementPosition } from '@onlook/models/element';

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
            `window.api?.startDrag('${escapeSelector(el.selector)}')`,
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
                  childSelector: string;
                  childUuid: string;
                  parentSelector: string;
                  parentUuid: string;
              }
            | undefined = await webview.executeJavaScript(`window.api?.endDrag()`);

        if (res) {
            const { newIndex, childSelector, parentSelector, childUuid, parentUuid } = res;
            if (newIndex !== this.originalIndex) {
                const moveAction = this.createMoveAction(
                    childSelector,
                    childUuid,
                    parentSelector,
                    parentUuid,
                    this.originalIndex,
                    newIndex,
                    webview.id,
                );
                this.editorEngine.action.run(moveAction);
            }
        }
        this.clear();
    }

    createMoveAction(
        childSelector: string,
        childUuid: string,
        parentSelector: string,
        parentUuid: string,
        originalIndex: number,
        newIndex: number,
        webviewId: string,
    ): MoveElementAction {
        return {
            type: 'move-element',
            location: {
                position: InsertPos.INDEX,
                targetSelector: parentSelector,
                index: newIndex,
                originalIndex,
            },
            targets: [
                {
                    webviewId,
                    selector: childSelector,
                    uuid: childUuid,
                },
            ],
        };
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
    }
}
