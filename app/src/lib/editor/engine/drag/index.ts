import React from 'react';
import { ActionManager } from '../action';
import { OverlayManager } from '../overlay';
import { escapeSelector } from '/common/helpers';
import { DomElement, Position } from '/common/models/element';

export class DragManager {
    dragElement: DomElement | undefined;
    dragOrigin: Position | undefined;

    constructor(
        private overlay: OverlayManager,
        private action: ActionManager,
    ) {}

    get isDragging() {
        return !!this.dragElement;
    }

    start(el: DomElement, position: Position, webview: Electron.WebviewTag) {
        this.dragElement = el;
        this.dragOrigin = position;
        webview.executeJavaScript(
            `window.api?.startDrag('${escapeSelector(this.dragElement.selector)}')`,
        );
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

        webview.executeJavaScript(`window.api?.drag(${dx}, ${dy}, ${x}, ${y})`);
    }

    end(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement) {
            return null;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        if (webview) {
            webview.executeJavaScript(`window.api?.endDrag(${x}, ${y})`);
        }
        this.dragElement = undefined;
    }
}
