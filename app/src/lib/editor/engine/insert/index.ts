// @ts-expect-error - No type for tokens
import { colors } from '/common/tokens';

import { EditorMode } from '@/lib/models';
import { nanoid } from 'nanoid';
import React from 'react';
import { EditorEngine } from '..';
import { EditorAttributes } from '/common/constants';
import { ActionElement, ActionTarget } from '/common/models/actions';
import { ElementPosition } from '/common/models/element';

export class InsertManager {
    isDrawing: boolean = false;
    private drawOrigin: { overlay: ElementPosition; webview: ElementPosition } | undefined;

    constructor(private editorEngine: EditorEngine) {}

    start(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToOverlay: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        this.isDrawing = true;
        const overlayPos = getRelativeMousePositionToOverlay(e);
        const webviewPos = getRelativeMousePositionToWebview(e);
        this.drawOrigin = { overlay: overlayPos, webview: webviewPos };
        this.updateInsertRect(overlayPos);
    }

    draw(
        e: React.MouseEvent<HTMLDivElement>,
        getRelativeMousePositionToOverlay: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
    ) {
        if (!this.isDrawing || !this.drawOrigin) {
            return;
        }

        const currentPos = getRelativeMousePositionToOverlay(e);
        const newRect = this.getDrawRect(this.drawOrigin.overlay, currentPos);
        this.editorEngine.overlay.updateInsertRect(newRect);
    }

    end(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag | null,
        getRelativeMousePositionToWebview: (e: React.MouseEvent<HTMLDivElement>) => ElementPosition,
        mode: EditorMode,
    ) {
        if (!this.isDrawing || !this.drawOrigin) {
            return null;
        }

        this.isDrawing = false;
        this.editorEngine.overlay.removeInsertRect();

        const webviewPos = getRelativeMousePositionToWebview(e);
        const newRect = this.getDrawRect(this.drawOrigin.webview, webviewPos);
        if (!webview) {
            console.error('Webview not found');
            return;
        }
        this.insertElement(webview, newRect, mode);
        this.drawOrigin = undefined;
    }

    private updateInsertRect(pos: ElementPosition) {
        const { x, y } = pos;
        const rect = new DOMRect(x, y, 0, 0);
        this.editorEngine.overlay.updateInsertRect(rect);
    }

    private getDrawRect(drawStart: ElementPosition, currentPos: ElementPosition): DOMRect {
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
        mode: EditorMode,
    ) {
        const location = await webview.executeJavaScript(
            `window.api?.getInsertLocation(${this.drawOrigin?.webview.x}, ${this.drawOrigin?.webview.y})`,
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

        const id = nanoid();

        const width = Math.max(Math.round(newRect.width), 30);
        const height = Math.max(Math.round(newRect.height), 30);
        const styles: Record<string, string> =
            mode === EditorMode.INSERT_TEXT
                ? {
                      width: `${width}px`,
                      height: `${height}px`,
                  }
                : {
                      width: `${width}px`,
                      height: `${height}px`,
                      backgroundColor: colors.blue[100],
                  };

        const actionElement: ActionElement = {
            selector: '',
            tagName: mode === EditorMode.INSERT_TEXT ? 'p' : 'div',
            attributes: {
                id,
                [EditorAttributes.DATA_ONLOOK_UNIQUE_ID]: id,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
                [EditorAttributes.DATA_ONLOOK_TIMESTAMP]: Date.now().toString(),
            },
            children: [],
            textContent: '',
            styles,
        };

        this.editorEngine.action.run({
            type: 'insert-element',
            targets: targets,
            location: location,
            element: actionElement,
            editText: mode === EditorMode.INSERT_TEXT,
        });
    }
}
