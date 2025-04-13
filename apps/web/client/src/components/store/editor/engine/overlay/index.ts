import type { DomElement, RectDimensions } from '@onlook/models/element';
import { reaction } from 'mobx';
import type { EditorEngine } from '..';
import { OverlayState } from './state';
import { adaptRectToCanvas } from './utils';

export class OverlayManager {
    scrollPosition: { x: number; y: number } = { x: 0, y: 0 };
    state: OverlayState = new OverlayState();
    private animationFrameId: number | null = null;
    private needsRefresh: boolean = false;

    constructor(private editorEngine: EditorEngine) {
        this.listenToScaleChange();
        this.startRefreshLoop();
    }

    private startRefreshLoop = () => {
        const loop = () => {
            if (this.needsRefresh) {
                this.performRefresh();
                this.needsRefresh = false;
            }
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    listenToScaleChange() {
        reaction(
            () => ({
                position: this.editorEngine.canvas?.position,
                scale: this.editorEngine.canvas?.scale,
            }),
            () => {
                this.needsRefresh = true;
            },
        );
    }

    private performRefresh = async () => {
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
        for (const clickRect of newClickRects) {
            this.state.addClickRect(clickRect.rect, clickRect.styles);
        }
    };

    // Change the public refreshOverlay to trigger the refresh flag
    refreshOverlay = () => {
        this.needsRefresh = true;
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
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.removeMeasurement();
        this.state.clear();
    };
}
