import { nanoid } from 'nanoid';
import React from 'react';
import { ActionManager } from '../action';
import { OverlayManager } from '../overlay';
import { ActionElement, ActionTarget } from '/common/actions';
import { EditorAttributes } from '/common/constants';
import { Position } from '/common/models/element';

export class InsertManager {
    isDrawing: boolean = false;
    private drawOrigin: { overlay: Position; webview: Position } | undefined;

    constructor(
        private overlay: OverlayManager,
        private action: ActionManager,
    ) {}

    start(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToOverlay: (e: React.MouseEvent<HTMLDivElement>) => Position,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        this.isDrawing = true;
        const overlayPos = getRelativeMousePositionToOverlay(e);
        const webviewPos = getRelativeMousePositionToWebview(e);
        this.drawOrigin = { overlay: overlayPos, webview: webviewPos };
        this.updateInsertRect(overlayPos);
    }

    draw(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToOverlay: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.isDrawing || !this.drawOrigin) {
            return;
        }

        const currentPos = getRelativeMousePositionToOverlay(e);
        const newRect = this.getDrawRect(this.drawOrigin.overlay, currentPos);
        this.overlay.updateInsertRect(newRect);
    }

    end(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => Position,
    ) {
        if (!this.isDrawing || !this.drawOrigin) {
            return null;
        }

        this.isDrawing = false;
        this.overlay.removeInsertRect();

        const webviewPos = getRelativeMousePositionToWebview(e);
        const newRect = this.getDrawRect(this.drawOrigin.webview, webviewPos);
        this.drawOrigin = undefined;
        if (!webview) {
            console.error('Webview not found');
            return;
        }
        this.insertElement(webview, newRect);
    }

    private updateInsertRect(pos: Position) {
        const { x, y } = pos;
        const rect = new DOMRect(x, y, 0, 0);
        this.overlay.updateInsertRect(rect);
    }

    private getDrawRect(drawStart: Position, currentPos: Position): DOMRect {
        const { x, y } = currentPos;
        let startX = drawStart.x;
        let startY = drawStart.y;
        let width = x - startX;
        let height = y - startY;

        if (width < 0) {
            startX = x;
            width = Math.abs(width);
        }

        if (height < 0) {
            startY = y;
            height = Math.abs(height);
        }

        return new DOMRect(startX, startY, width, height);
    }

    async insertElement(
        webview: Electron.WebviewTag,
        newRect: { x: number; y: number; width: number; height: number },
    ) {
        const location = await webview.executeJavaScript(
            `window.api?.getInsertLocation(${newRect.x}, ${newRect.y})`,
        );
        if (!location) {
            console.error('Insert position not found');
            return;
        }

        const targets: Array<ActionTarget> = [
            {
                webviewId: webview.id,
            },
        ];

        const actionElement: ActionElement = {
            tagName: 'div',
            attributes: {
                [EditorAttributes.DATA_ONLOOK_UNIQUE_ID]: nanoid(),
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
                [EditorAttributes.DATA_ONLOOK_TIMESTAMP]: Date.now().toString(),
            },
            children: [],
            textContent: '',
        };

        const width = Math.max(Math.round(newRect.width), 30);
        const height = Math.max(Math.round(newRect.height), 30);
        const defaultStyles = {
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'rgb(120, 113, 108)',
        };

        this.action.run({
            type: 'insert-element',
            targets: targets,
            location: location,
            element: actionElement,
            styles: defaultStyles,
        });
    }
}
