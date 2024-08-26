import { nanoid } from 'nanoid';
import React from 'react';
import { HistoryManager } from '../history';
import { OverlayManager } from '../overlay';
import { MoveElementAction } from '/common/actions';
import { escapeSelector } from '/common/helpers';
import { DomElement, Position } from '/common/models/element';

export class MoveManager {
    dragElement: DomElement | undefined;
    dragOrigin: Position | undefined;
    originalIndex: number | undefined;
    targetWebviewId: string | undefined;
    MIN_DRAG_DISTANCE = 10;

    constructor(
        private overlay: OverlayManager,
        private history: HistoryManager,
    ) {}

    get isDragging() {
        return !!this.dragElement;
    }

    async start(el: DomElement, position: Position, webview: Electron.WebviewTag) {
        this.dragElement = el;
        this.dragOrigin = position;
        this.targetWebviewId = webview.id;
        this.originalIndex = await webview.executeJavaScript(
            `window.api?.startDrag('${escapeSelector(this.dragElement.selector)}', '${nanoid()}')`,
        );

        if (this.originalIndex === undefined || this.originalIndex === -1) {
            this.clear();
            return;
        }
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
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

    async end(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement) {
            console.error('Cannot end drag without drag element');
            return;
        }

        if (webview) {
            const { x, y } = getRelativeMousePositionToWebview(e);
            const { newIndex, newSelector } = await webview.executeJavaScript(
                `window.api?.endDrag(${x}, ${y})`,
            );
            if (newIndex !== this.originalIndex) {
                const action = this.createAction(newSelector, this.originalIndex!, newIndex);
                this.history.push(action!);
            }
        } else {
            console.error('Cannot end drag without webview');
        }

        this.clear();
    }

    createAction(
        newSelector: string,
        originalIndex: number,
        newIndex: number,
    ): MoveElementAction | undefined {
        if (!this.targetWebviewId) {
            console.error('Cannot create action without target webview id');
            return;
        }

        return {
            type: 'move-element',
            originalIndex,
            newIndex,
            targets: [{ webviewId: this.targetWebviewId, selector: newSelector }],
        };
    }

    clear() {
        this.dragElement = undefined;
        this.originalIndex = undefined;
        this.targetWebviewId = undefined;
    }
}
