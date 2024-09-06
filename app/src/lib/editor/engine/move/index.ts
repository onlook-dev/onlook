import { nanoid } from 'nanoid';
import React from 'react';
import { HistoryManager } from '../history';
import { OverlayManager } from '../overlay';
import { MoveElementAction } from '/common/actions';
import { escapeSelector } from '/common/helpers';
import { DomElement, ElementPosition } from '/common/models/element';

export class MoveManager {
    dragOrigin: ElementPosition | undefined;
    originalIndex: number | undefined;
    MIN_DRAG_DISTANCE = 10;

    constructor(
        private overlay: OverlayManager,
        private history: HistoryManager,
    ) {}

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
            this.overlay.clear();
            webview.executeJavaScript(`window.api?.drag(${dx}, ${dy}, ${x}, ${y})`);
        }
    }

    async end(e: React.MouseEvent<HTMLDivElement>, webview: Electron.WebviewTag | null) {
        if (this.originalIndex === undefined || !webview) {
            this.clear();
            return;
        }

        const endRes: { newIndex: number; newSelector: string } | undefined =
            await webview.executeJavaScript(`window.api?.endDrag('${nanoid()}')`);

        if (!endRes) {
            console.error('No response for end drag');
            this.clear();
            return;
        }

        const { newIndex, newSelector } = endRes;
        if (newIndex !== this.originalIndex) {
            this.pushMoveAction(newSelector, this.originalIndex, newIndex, webview.id);
        }
        this.clear();
    }

    pushMoveAction(
        newSelector: string,
        originalIndex: number,
        newIndex: number,
        webviewId: string,
    ) {
        const action: MoveElementAction = {
            type: 'move-element',
            originalIndex,
            newIndex,
            targets: [{ webviewId, selector: newSelector }],
        };
        this.history.push(action);
    }

    clear() {
        this.originalIndex = undefined;
        this.dragOrigin = undefined;
    }
}
