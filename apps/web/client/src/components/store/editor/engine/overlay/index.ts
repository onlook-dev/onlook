import type { DomElement, RectDimensions } from '@onlook/models/element';
import { reaction } from 'mobx';
import type { EditorEngine } from '..';
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
                position: this.editorEngine.canvas?.position,
                scale: this.editorEngine.canvas?.scale,
            }),
            () => {
                this.refreshOverlay();
            },
        );
    }

    refreshOverlay = async () => {
        // Refresh hover rect
        this.state.removeHoverRect();

        // Refresh click rects
        const newClickRects: { rect: RectDimensions; styles: Record<string, string> }[] = [];
        for (const selectedElement of this.editorEngine.elements.selected) {
            const frameData = this.editorEngine.frames.get(selectedElement.frameId);
            if (!frameData) {
                console.error('Frame data not found');
                continue;
            }
            const { view } = frameData;
            const el: DomElement = await view.getDomElementByDomId(selectedElement.domId, true);
            if (!el) {
                console.error('Element not found');
                continue;
            }
            const adaptedRect = adaptRectToCanvas(el.rect, view);
            newClickRects.push({ rect: adaptedRect, styles: el.styles?.computed || {} });
        }

        this.state.removeClickRects();
        // for (const clickRect of newClickRects) {
        //     if (!this.editorEngine.text.isEditing) {
        //         this.state.addClickRect(clickRect.rect, clickRect.styles);
        //     } else {
        //         this.state.updateTextEditor(clickRect.rect);
        //     }
        // }
    };

    showMeasurement() {
        this.editorEngine.overlay.removeMeasurement();
        if (!this.editorEngine.elements.selected.length || !this.editorEngine.elements.hovered) {
            return;
        }

        const selectedEl = this.editorEngine.elements.selected[0];
        if (!selectedEl) {
            return;
        }

        const hoverEl = this.editorEngine.elements.hovered;
        const frameId = selectedEl.frameId;
        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData) {
            return;
        }

        const { view } = frameData;

        const selectedRect = adaptRectToCanvas(selectedEl.rect, view);
        const hoverRect = adaptRectToCanvas(hoverEl.rect, view);

        this.editorEngine.overlay.updateMeasurement(selectedRect, hoverRect);
    }

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
