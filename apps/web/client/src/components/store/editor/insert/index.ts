import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame';
import { DefaultSettings, EditorAttributes } from '@onlook/constants';
import type {
    DropElementProperties,
    ElementPosition,
    ImageContentData,
    RectDimensions,
} from '@onlook/models';
import { EditorMode } from '@onlook/models';
import {
    type ActionElement,
    type ActionLocation,
    type ActionTarget,
    type InsertElementAction,
    type UpdateStyleAction,
} from '@onlook/models/actions';
import { StyleChangeType } from '@onlook/models/style';
import { colors } from '@onlook/ui/tokens';
import { createDomId, createOid } from '@onlook/utility';
import type React from 'react';
import type { EditorEngine } from '../engine';
import type { FrameData } from '../frames';
import { getRelativeMousePositionToFrameView } from '../overlay/utils';

export class InsertManager {
    isDrawing = false;
    private drawOrigin: ElementPosition | undefined;

    constructor(private editorEngine: EditorEngine) { }

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

    start(e: React.MouseEvent<HTMLDivElement>) {
        this.isDrawing = true;
        this.drawOrigin = {
            x: e.clientX,
            y: e.clientY,
        };
        this.updateInsertRect(this.drawOrigin);
    }

    draw(e: React.MouseEvent<HTMLDivElement>) {
        if (!this.isDrawing || !this.drawOrigin) {
            return;
        }
        const currentPos = {
            x: e.clientX,
            y: e.clientY,
        };
        this.updateInsertRect(currentPos);
    }

    async end(e: React.MouseEvent<HTMLDivElement>, frameView: WebFrameView | null) {
        if (!this.isDrawing || !this.drawOrigin) {
            return null;
        }

        this.isDrawing = false;
        this.editorEngine.overlay.state.updateInsertRect(null);

        if (!frameView) {
            console.error('frameView not found');
            return;
        }
        const currentPos = { x: e.clientX, y: e.clientY };
        const newRect = this.getDrawRect(currentPos);

        const origin = getRelativeMousePositionToFrameView(e, frameView);
        await this.insertElement(frameView, newRect, origin);
        this.drawOrigin = undefined;
    }

    private updateInsertRect(pos: ElementPosition) {
        const rect = this.getDrawRect(pos);
        const overlayContainer = document.getElementById(EditorAttributes.OVERLAY_CONTAINER_ID);
        if (!overlayContainer) {
            console.error('Overlay container not found');
            return;
        }
        const containerRect = overlayContainer.getBoundingClientRect();
        this.editorEngine.overlay.state.updateInsertRect({
            ...rect,
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
        });
    }

    private getDrawRect(currentPos: ElementPosition): RectDimensions {
        if (!this.drawOrigin) {
            return {
                top: currentPos.y,
                left: currentPos.x,
                width: 0,
                height: 0,
            };
        }
        const { x, y } = currentPos;
        let startX = this.drawOrigin.x;
        let startY = this.drawOrigin.y;
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

        return {
            top: startY,
            left: startX,
            width,
            height,
        };
    }

    async insertElement(frameView: WebFrameView, newRect: RectDimensions, origin: ElementPosition) {
        const insertAction = await this.createInsertAction(frameView, newRect, origin);
        if (!insertAction) {
            console.error('Failed to create insert action');
            return;
        }
        await this.editorEngine.action.run(insertAction);
    }

    async createInsertAction(
        frameView: WebFrameView,
        newRect: RectDimensions,
        origin: ElementPosition,
    ): Promise<InsertElementAction | undefined> {
        const location = await frameView.getInsertLocation(origin.x, origin.y);
        if (!location) {
            console.error('Insert position not found');
            return;
        }
        const mode = this.editorEngine.state.editorMode;
        const domId = createDomId();
        const oid = createOid();
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
                frameId: frameView.id,
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
            codeBlock: null,
        };
    }

    async insertDroppedImage(
        frame: FrameData,
        dropPosition: { x: number; y: number },
        imageData: ImageContentData,
    ) {
        const location = await frame.view.getInsertLocation(dropPosition.x, dropPosition.y);

        if (!location) {
            console.error('Failed to get insert location for drop');
            return;
        }

        const targetElement = await frame.view.getElementAtLoc(
            dropPosition.x,
            dropPosition.y,
            false,
        );

        if (!targetElement) {
            console.error('Failed to get element at drop position');
            return;
        }

        // TODO: Handle if element is already an image, should update source
        // TODO: Handle if element has background image, should update style
        this.insertImageElement(frame, location, imageData);
    }

    insertImageElement(frame: FrameData, location: ActionLocation, imageData: ImageContentData) {
        const url = imageData.originPath.replace(new RegExp(`^${DefaultSettings.IMAGE_FOLDER}\/`), '');
        const domId = createDomId();
        const oid = createOid();

        const imageElement: ActionElement = {
            domId,
            oid,
            tagName: 'img',
            children: [],
            attributes: {
                [EditorAttributes.DATA_ONLOOK_ID]: oid,
                [EditorAttributes.DATA_ONLOOK_DOM_ID]: domId,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
                src: `/${url}`,
                alt: imageData.fileName,
            },
            styles: {
                width: DefaultSettings.IMAGE_DIMENSION.width,
                height: DefaultSettings.IMAGE_DIMENSION.height,
            },
            textContent: null,
        };

        const action: InsertElementAction = {
            type: 'insert-element',
            targets: [{ frameId: frame.frame.id, domId, oid }],
            element: imageElement,
            location,
            editText: false,
            pasteParams: null,
            codeBlock: null,
        };
        this.editorEngine.action.run(action);
    }

    updateElementBackgroundAction(
        frame: FrameData,
        targetElement: ActionElement,
        imageData: ImageContentData,
    ) {
        const url = imageData.originPath.replace(new RegExp(`^${DefaultSettings.IMAGE_FOLDER}\/`), '');
        const action: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    change: {
                        updated: {
                            backgroundImage: {
                                value: `url('/${url}')`,
                                type: StyleChangeType.Value,
                            },
                            backgroundSize: {
                                value: 'cover',
                                type: StyleChangeType.Value,
                            },
                            backgroundPosition: {
                                value: 'center',
                                type: StyleChangeType.Value,
                            },
                        },
                        original: {},
                    },

                    domId: targetElement.domId,
                    oid: targetElement.oid,
                    frameId: frame.frame.id,
                },
            ],
        };
        this.editorEngine.action.run(action);
    }

    async insertDroppedElement(
        frame: FrameData,
        dropPosition: { x: number; y: number },
        properties: DropElementProperties,
    ) {
        const location = await frame.view.getInsertLocation(dropPosition.x, dropPosition.y);

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
                    frameId: frame.frame.id,
                    domId,
                    oid: null,
                },
            ],
            element,
            location,
            editText: properties.tagName === 'p',
            pasteParams: null,
            codeBlock: null,
        };

        this.editorEngine.action.run(action);
    }

    clear() {
        // Clear drawing state
        this.isDrawing = false;
    }
}
