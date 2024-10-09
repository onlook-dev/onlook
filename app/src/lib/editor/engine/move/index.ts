import React from 'react';
import { EditorEngine } from '..';
import { MoveElementAction } from '/common/actions';
import { escapeSelector } from '/common/helpers';
import { DomElement, ElementPosition } from '/common/models/element';

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

        const res: { newIndex: number; selector: string } | undefined =
            await webview.executeJavaScript(`window.api?.endDrag()`);
        if (res) {
            const { newIndex, selector } = res;
            if (newIndex !== this.originalIndex) {
                const moveAction = this.createMoveAction(
                    selector,
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
        newSelector: string,
        originalIndex: number,
        newIndex: number,
        webviewId: string,
    ): MoveElementAction {
        return {
            type: 'move-element',
            originalIndex,
            newIndex,
            targets: [{ webviewId, selector: newSelector }],
        };
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
    }
}
