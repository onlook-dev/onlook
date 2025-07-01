import type { DomElement, DomElementStyles, RectDimensions } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable, reaction } from 'mobx';
import type { CanvasManager } from '../canvas';
import type { ElementsManager } from '../element';
import type { FramesManager } from '../frames';
import type { StateManager } from '../state';
import { OverlayState } from './state';
import { adaptRectToCanvas } from './utils';

export class OverlayManager {
    state: OverlayState = new OverlayState();

    constructor(
        private readonly canvasManager: CanvasManager,
        private readonly elementsManager: ElementsManager,
        private readonly framesManager: FramesManager,
        private readonly stateManager: StateManager,
    ) {
        makeAutoObservable(this);
        reaction(
            () => ({
                position: this.canvasManager.position,
                scale: this.canvasManager.scale,
                shouldHideOverlay: this.stateManager.shouldHideOverlay,
            }),
            () => {
                this.refresh();
            },
        );
    }

    undebouncedRefresh = async () => {
        this.state.removeHoverRect();

        // Refresh click rects
        const newClickRects: { rect: RectDimensions; styles: DomElementStyles | null }[] = [];
        for (const selectedElement of this.elementsManager.selected) {
            const frameData = this.framesManager.get(selectedElement.frameId);
            if (!frameData) {
                console.error('Frame data not found');
                continue;
            }
            const { view } = frameData;
            const el: DomElement = await view.getElementByDomId(selectedElement.domId, true);
            if (!el) {
                console.error('Element not found');
                continue;
            }
            const adaptedRect = adaptRectToCanvas(el.rect, view);
            newClickRects.push({ rect: adaptedRect, styles: el.styles });
        }

        this.state.removeClickRects();
        for (const clickRect of newClickRects) {
            this.state.addClickRect(clickRect.rect, clickRect.styles);
        }
    };

    refresh = debounce(this.undebouncedRefresh, 100, { leading: true });

    showMeasurement() {
        this.removeMeasurement();
        if (!this.elementsManager.selected.length || !this.elementsManager.hovered) {
            return;
        }

        const selectedEl = this.elementsManager.selected[0];
        if (!selectedEl) {
            return;
        }

        const hoverEl = this.elementsManager.hovered;
        const frameId = selectedEl.frameId;
        const frameData = this.framesManager.get(frameId);
        if (!frameData) {
            return;
        }

        const { view } = frameData;

        const selectedRect = adaptRectToCanvas(selectedEl.rect, view);
        const hoverRect = adaptRectToCanvas(hoverEl.rect, view);

        this.updateMeasurement(selectedRect, hoverRect);
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
