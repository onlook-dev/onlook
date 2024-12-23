import type { DomElement } from '@onlook/models/element';
import type { WebviewTag } from 'electron/renderer';
import { reaction } from 'mobx';
import type { EditorEngine } from '..';
import { MeasurementImpl } from './measurement';
import type { RectDimensions } from './rect';
import { EditTextInput } from './textEdit';
import type { OverlayContainer } from './types';
import { adaptRectToOverlay } from './utils';

export class OverlayManager {
    overlayContainer: OverlayContainer | undefined;
    overlayElement: HTMLElement | undefined;
    editTextInput: EditTextInput;
    measureEle: MeasurementImpl;
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };

    constructor(private editorEngine: EditorEngine) {
        this.editTextInput = new EditTextInput();
        this.measureEle = new MeasurementImpl();
        this.listenToScaleChange();
    }

    listenToScaleChange() {
        reaction(
            () => ({
                position: this.editorEngine.canvas.position,
                scale: this.editorEngine.canvas.scale,
            }),
            ({ position, scale }) => {
                this.refreshOverlay();
            },
        );
    }

    refreshOverlay = async () => {
        this.refreshClickRects();
    };

    refreshClickRects = async () => {
        if (!this.overlayContainer) {
            return;
        }
        this.removeHoverRect();
        const newClickRects: { rect: RectDimensions; styles: Record<string, string> }[] = [];
        for (const selectedElement of this.editorEngine.elements.selected) {
            const webview = this.editorEngine.webviews.getWebview(selectedElement.webviewId);
            if (!webview) {
                continue;
            }
            const el: DomElement = await webview.executeJavaScript(
                `window.api?.getDomElementByDomId('${selectedElement.domId}', true)`,
            );
            if (!el) {
                continue;
            }
            const adaptedRect = this.adaptRect(el.rect, webview);
            newClickRects.push({ rect: adaptedRect, styles: el.styles?.computed || {} });
        }
        this.overlayContainer.removeClickRects();
        for (const clickRect of newClickRects) {
            this.overlayContainer.addClickRect(clickRect.rect, clickRect.styles);
        }
    };

    getDOMContainer = () => {
        if (!this.overlayElement) {
            throw new Error('Overlay element not initialized');
        }
        return this.overlayElement;
    };

    setOverlayContainer = (container: OverlayContainer | HTMLElement) => {
        if (container instanceof HTMLElement) {
            this.overlayElement = container;
            container.appendChild(this.editTextInput.element);
            container.appendChild(this.measureEle.element);
        } else {
            this.overlayContainer = container;
        }
    };

    adaptRect = (rect: DOMRect, webview: WebviewTag): RectDimensions => {
        if (!this.overlayElement) {
            throw new Error('Overlay element not initialized');
        }
        return adaptRectToOverlay(rect, webview, this.overlayElement);
    };

    addClickRect = (
        rect: RectDimensions | DOMRect,
        style: Record<string, string>,
        isComponent?: boolean,
    ) => {
        if (!this.overlayContainer) {
            return;
        }

        this.overlayContainer.addClickRect(rect, style, isComponent);
    };

    updateHoverRect = (rect: RectDimensions | DOMRect | null, isComponent?: boolean) => {
        if (!this.overlayContainer) {
            return;
        }

        if (!rect) {
            this.overlayContainer.updateHoverRect(null);
            return;
        }

        this.overlayContainer.updateHoverRect(rect, isComponent);
    };

    updateInsertRect = (rect: RectDimensions | DOMRect | null) => {
        if (!this.overlayContainer) {
            return;
        }

        if (!rect) {
            this.overlayContainer.updateInsertRect(null);
            return;
        }

        this.overlayContainer.updateInsertRect({
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
        });
    };

    updateMeasurement = (fromRect: RectDimensions | DOMRect, toRect: RectDimensions | DOMRect) => {
        this.measureEle.render(fromRect, toRect);
    };

    updateEditTextInput = (
        rect: RectDimensions | DOMRect,
        content: string,
        styles: Record<string, string>,
        onChange: (content: string) => void,
        onStop: () => void,
        isComponent?: boolean,
    ) => {
        this.editTextInput.render(rect, content, styles, onChange, onStop, isComponent);
        this.editTextInput.enable();
    };

    updateTextInputSize = (rect: RectDimensions | DOMRect) => {
        this.editTextInput.updateSize(rect);
    };

    removeHoverRect = () => {
        if (this.overlayContainer) {
            this.overlayContainer.updateHoverRect(null);
        }
    };

    removeInsertRect = () => {
        if (this.overlayContainer) {
            this.overlayContainer.updateInsertRect(null);
        }
    };

    removeClickedRects = () => {
        if (this.overlayContainer) {
            this.overlayContainer.removeClickRects();
        }
    };

    removeEditTextInput = () => {
        this.editTextInput.render({ width: 0, height: 0, top: 0, left: 0 });
        this.editTextInput.element.style.display = 'none';
        this.editTextInput.disable();
    };

    removeMeasurement = () => {
        this.measureEle.remove();
    };

    clear = () => {
        if (this.overlayContainer) {
            this.overlayContainer.clear();
        }
        this.removeEditTextInput();
        this.removeMeasurement();
    };
}
