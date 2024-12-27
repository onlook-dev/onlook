import type { DomElement } from '@onlook/models/element';
import { reaction } from 'mobx';
import type { EditorEngine } from '..';
import { MeasurementImpl } from './measurement';
import type { RectDimensions } from './rect';
import { OverlayState } from './state';
import { adaptRectToCanvas } from './utils';

export class OverlayManager {
    measureEle: MeasurementImpl;
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };
    state: OverlayState = new OverlayState();

    constructor(private editorEngine: EditorEngine) {
        // TODO: Refactor measureEle to be React component similar to ClickRect
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

    updateMeasurement = (fromRect: RectDimensions | DOMRect, toRect: RectDimensions | DOMRect) => {
        this.measureEle.render(fromRect, toRect);
    };

    removeMeasurement = () => {
        this.measureEle.remove();
    };

    clear = () => {
        this.removeMeasurement();
        this.state.clear();
    };
}
