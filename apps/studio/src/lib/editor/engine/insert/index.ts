import { EditorMode } from '@/lib/models';
import { createDomId, createOid } from '@/lib/utils';
import type {
    ActionElement,
    ActionLocation,
    ActionTarget,
    InsertElementAction,
} from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import type { DropElementProperties, ElementPosition } from '@onlook/models/element';
import { colors } from '@onlook/ui/tokens';
import type React from 'react';
import type { EditorEngine } from '..';

export class InsertManager {
    isDrawing = false;
    private drawOrigin: { overlay: ElementPosition; webview: ElementPosition } | undefined;

    constructor(private editorEngine: EditorEngine) {}

    getDefaultProperties(mode: EditorMode): DropElementProperties {
        switch (mode) {
            case EditorMode.INSERT_TEXT:
                return {
                    tagName: 'p',
                    styles: {
                        fontSize: '20px',
                        lineHeight: '24px',
                        color: '#000000',
                    },
                    textContent: null,
                };
            case EditorMode.INSERT_DIV:
                return {
                    tagName: 'div',
                    styles: {
                        width: '100px',
                        height: '100px',
                        backgroundColor: colors.blue[100],
                    },
                    textContent: null,
                };
            default:
                throw new Error(`No element properties defined for mode: ${mode}`);
        }
    }

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

        if (
            this.editorEngine.mode === EditorMode.INSERT_TEXT &&
            newRect.width < 10 &&
            newRect.height < 10
        ) {
            this.editorEngine.text.editElementAtLoc(this.drawOrigin.webview, webview);
            this.drawOrigin = undefined;
            return;
        }
        this.insertElement(webview, newRect);
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
    ) {
        const insertAction = await this.createInsertAction(webview, newRect);
        if (!insertAction) {
            console.error('Failed to create insert action');
            return;
        }
        this.editorEngine.action.run(insertAction);
    }

    async createInsertAction(
        webview: Electron.WebviewTag,
        newRect: { x: number; y: number; width: number; height: number },
    ): Promise<InsertElementAction | undefined> {
        const location: ActionLocation | undefined = await webview.executeJavaScript(
            `window.api?.getInsertLocation(${this.drawOrigin?.webview.x}, ${this.drawOrigin?.webview.y})`,
        );
        if (!location) {
            console.error('Insert position not found');
            return;
        }
        const mode = this.editorEngine.mode;
        const domId = createDomId();
        const oid = createOid();
        const width = Math.max(Math.round(newRect.width), 30);
        const height = Math.max(Math.round(newRect.height), 30);
        const styles: Record<string, string> =
            mode === EditorMode.INSERT_TEXT
                ? {
                      width: `${width}px`,
                      height: `${height}px`,
                      color: '#000000',
                  }
                : {
                      width: `${width}px`,
                      height: `${height}px`,
                      backgroundColor: colors.blue[100],
                  };

        const actionElement: ActionElement = {
            domId,
            oid,
            tagName: mode === EditorMode.INSERT_TEXT ? 'p' : 'div',
            attributes: {
                [EditorAttributes.DATA_ONLOOK_DOM_ID]: domId,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
                [EditorAttributes.DATA_ONLOOK_ID]: oid,
            },
            children: [],
            textContent: null,
            styles,
        };

        const targets: Array<ActionTarget> = [
            {
                webviewId: webview.id,
                domId,
                oid: null,
            },
        ];

        return {
            type: 'insert-element',
            targets: targets,
            location: location,
            element: actionElement,
            editText: mode === EditorMode.INSERT_TEXT,
            pasteParams: null,
        };
    }

    async insertDroppedElement(
        webview: Electron.WebviewTag,
        dropPosition: { x: number; y: number },
        properties: DropElementProperties,
    ) {
        const location = await webview.executeJavaScript(
            `window.api?.getInsertLocation(${dropPosition.x}, ${dropPosition.y})`,
        );

        if (!location) {
            console.error('Failed to get insert location for drop');
            return;
        }

        const domId = createDomId();
        const oid = createOid();
        const element: ActionElement = {
            domId,
            oid,
            tagName: properties.tagName,
            styles: properties.styles,
            children: [],
            attributes: {
                [EditorAttributes.DATA_ONLOOK_ID]: oid,
                [EditorAttributes.DATA_ONLOOK_DOM_ID]: domId,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
            },
            textContent: properties.textContent || null,
        };

        const action: InsertElementAction = {
            type: 'insert-element',
            targets: [
                {
                    webviewId: webview.id,
                    domId,
                    oid: null,
                },
            ],
            element,
            location,
            editText: properties.tagName === 'p',
            pasteParams: null,
        };

        this.editorEngine.action.run(action);
    }
}
