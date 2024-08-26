import { nanoid } from 'nanoid';
import React from 'react';
import { ActionManager } from '../action';
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
        private action: ActionManager,
        private history: HistoryManager,
    ) {}

    get isDragging() {
        return !!this.dragElement;
    }

    async start(el: DomElement, position: Position, webview: Electron.WebviewTag) {
        this.dragElement = el;
        this.dragOrigin = position;
        this.targetWebviewId = webview.id;

        const originalIndex = await webview.executeJavaScript(
            `window.api?.startDrag('${escapeSelector(this.dragElement.selector)}', '${nanoid()}')`,
        );
        if (originalIndex === -1) {
            this.dragElement = undefined;
            this.dragOrigin = undefined;
            this.targetWebviewId = undefined;
            return;
        }
        this.originalIndex = originalIndex;
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement || !webview) {
            return;
        }
        this.overlay.clear();

        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.dragOrigin!.x;
        const dy = y - this.dragOrigin!.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > this.MIN_DRAG_DISTANCE) {
            webview.executeJavaScript(`window.api?.drag(${dx}, ${dy}, ${x}, ${y})`);
        }
    }

    async end(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement) {
            return null;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);

        if (webview) {
            const { newIndex, newSelector } = await webview.executeJavaScript(
                `window.api?.endDrag(${x}, ${y})`,
            );

            if (newIndex !== this.originalIndex) {
                const action = this.createAction(newSelector, this.originalIndex!, newIndex);
                this.history.push(action!);
            }
        }

        this.dragElement = undefined;
        this.originalIndex = undefined;
        this.targetWebviewId = undefined;
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
}
