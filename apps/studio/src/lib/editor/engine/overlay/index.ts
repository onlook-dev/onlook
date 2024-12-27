import type { DomElement } from '@onlook/models/element';
import { reaction } from 'mobx';
import type { EditorEngine } from '..';
import { MeasurementImpl } from './measurement';
import type { RectDimensions } from './rect';
import { OverlayState } from './state';
import { adaptRectToCanvas } from './utils';

export class OverlayManager {
    overlayElement: HTMLElement | undefined;
    measureEle: MeasurementImpl;
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };
    state: OverlayState = new OverlayState();

    constructor(private editorEngine: EditorEngine) {
        this.measureEle = new MeasurementImpl();
        this.listenToScaleChange();
    }

    listenToScaleChange() {
        reaction(
            () => ({
                position: this.editorEngine.canvas.position,
                scale: this.editorEngine.canvas.scale,
            }),
            () => {
                this.refreshOverlay();
            },
        );
    }

    refreshOverlay = async () => {
        this.state.updateHoverRect(null);
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
            const adaptedRect = adaptRectToCanvas(el.rect, webview);
            newClickRects.push({ rect: adaptedRect, styles: el.styles?.computed || {} });
        }
        this.state.removeClickRects();
        for (const clickRect of newClickRects) {
            if (!this.editorEngine.text.isEditing) {
                this.state.addClickRect(clickRect.rect, clickRect.styles);
            } else {
                this.state.updateTextEditor(clickRect.rect);
            }
        }
    };

    getDOMContainer = () => {
        if (!this.overlayElement) {
            throw new Error('Overlay element not initialized');
        }
        return this.overlayElement;
    };

    setOverlayContainer = (container: HTMLElement) => {
        this.overlayElement = container;
        container.appendChild(this.measureEle.element);
    };

    addClickRect = (
        rect: RectDimensions | DOMRect,
        style: Record<string, string>,
        isComponent?: boolean,
    ) => {
        this.state.addClickRect(rect, style, isComponent);
    };

    updateHoverRect = (rect: RectDimensions | DOMRect | null, isComponent?: boolean) => {
        this.state.updateHoverRect(rect, isComponent);
    };

    updateInsertRect = (rect: RectDimensions | DOMRect | null) => {
        if (!rect) {
            this.state.updateInsertRect(null);
            return;
        }

        this.state.updateInsertRect({
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
        this.state.addTextEditor(rect, content, styles, onChange, onStop, isComponent);
    };

    removeHoverRect = () => {
        this.state.updateHoverRect(null);
    };

    removeInsertRect = () => {
        this.state.updateInsertRect(null);
    };

    removeClickedRects = () => {
        this.state.removeClickRects();
    };

    removeEditTextInput = () => {
        this.state.removeTextEditor();
    };

    removeMeasurement = () => {
        this.measureEle.remove();
    };

    clear = () => {
        this.removeEditTextInput();
        this.removeMeasurement();
        this.state.clear();
    };
}
