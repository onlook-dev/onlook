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

    start(el: DomElement, position: Position) {
        this.dragElement = el;
        this.dragOrigin = position;
    }

    drag(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.dragElement || !webview) {
            return;
        }
        const { x, y } = getRelativeMousePositionToWebview(e);
        const dx = x - this.dragOrigin!.x;
        const dy = y - this.dragOrigin!.y;
        webview.executeJavaScript(
            `window.api?.dragElement(${dx}, ${dy}, '${escapeSelector(this.dragElement.selector)}')`,
        );
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
            webview.executeJavaScript(
                `window.api?.endDragElement(${x}, ${y}, '${escapeSelector(this.dragElement.selector)}')`,
            );
        }
        this.dragElement = undefined;
    }
}
