import type { DomElement, DomElementStyles } from '@onlook/models/element';
import { reaction } from 'mobx';
import type { EditorEngine } from '..';
import type { RectDimensions } from './rect';
import { OverlayState } from './state';
import { adaptRectToCanvas } from './utils';

export class OverlayManager {
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };
    state: OverlayState = new OverlayState();

    constructor(private editorEngine: EditorEngine) {
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
        const newClickRects: { rect: RectDimensions; styles: DomElementStyles | null }[] = [];
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
            newClickRects.push({ rect: adaptedRect, styles: el.styles });
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

    updateMeasurement = (fromRect: RectDimensions, toRect: RectDimensions) => {
        this.state.updateMeasurement(fromRect, toRect);
    };

    removeMeasurement = () => {
        this.state.removeMeasurement();
    };

    clear = () => {
        this.removeMeasurement();
        this.state.clear();
    };
}
