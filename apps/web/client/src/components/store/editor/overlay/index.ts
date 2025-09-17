import type { DomElement, DomElementStyles, RectDimensions } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { OverlayState } from './state';
import { adaptRectToCanvas } from './utils';

export class OverlayManager {
    state: OverlayState = new OverlayState();
    private canvasReactionDisposer?: () => void;
    private pendingRefreshPromise?: Promise<void>;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    init() {
        this.canvasReactionDisposer = reaction(
            () => ({
                position: this.editorEngine.canvas?.position,
                scale: this.editorEngine.canvas?.scale,
                shouldHideOverlay: this.editorEngine.state?.shouldHideOverlay,
            }),
            () => {
                this.refresh();
            },
        );
    }

    undebouncedRefresh = async () => {
        // Prevent multiple refresh operations from running concurrently
        if (this.pendingRefreshPromise) {
            return this.pendingRefreshPromise;
        }
        
        this.pendingRefreshPromise = this.performRefresh();
        
        try {
            await this.pendingRefreshPromise;
        } finally {
            this.pendingRefreshPromise = undefined;
        }
    };
    
    private performRefresh = async () => {
        this.state.removeHoverRect();

        // Refresh click rects
        const newClickRects: { rect: RectDimensions; styles: DomElementStyles | null }[] = [];
        
        // Limit the number of elements to refresh to prevent performance issues
        const MAX_ELEMENTS_TO_REFRESH = 10;
        const elementsToRefresh = this.editorEngine.elements.selected.slice(0, MAX_ELEMENTS_TO_REFRESH);
        
        for (const selectedElement of elementsToRefresh) {
            const frameData = this.editorEngine.frames.get(selectedElement.frameId);
            if (!frameData) {
                // Removed console.error to prevent log spam
                continue;
            }
            const { view } = frameData;
            if (!view) {
                // Removed console.error to prevent log spam
                continue;
            }
            const el: DomElement = await view.getElementByDomId(selectedElement.domId, true);
            if (!el) {
                // Removed console.error to prevent log spam
                continue;
            }
            const adaptedRect = adaptRectToCanvas(el.rect, view);
            newClickRects.push({ rect: adaptedRect, styles: el.styles });
        }

        this.state.removeClickRects();
        for (const clickRect of newClickRects) {
            this.state.addClickRect(clickRect.rect, clickRect.styles);
        }

        // Refresh text editor position if it's active
        if (this.editorEngine.text.isEditing && this.editorEngine.text.targetElement) {
            const targetElement = this.editorEngine.text.targetElement;
            const frameData = this.editorEngine.frames.get(targetElement.frameId);
            if (frameData?.view) {
                try {
                    const el: DomElement = await frameData.view.getElementByDomId(
                        targetElement.domId,
                        true,
                    );
                    if (el) {
                        const adaptedRect = adaptRectToCanvas(el.rect, frameData.view);
                        this.state.updateTextEditor(adaptedRect, {
                            styles: el.styles?.computed
                        });
                    }
                } catch {
                    // Removed console.error to prevent log spam
                }
            }
        }
    };

    refresh = debounce(this.undebouncedRefresh, 100, { leading: true, trailing: true, maxWait: 500 });

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

        if (!view) {
            console.error('No frame view found');
            return;
        }

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

    clearUI = () => {
        this.removeMeasurement();
        this.state.clear();
    };

    clear = () => {
        this.canvasReactionDisposer?.();
        this.canvasReactionDisposer = undefined;
        this.pendingRefreshPromise = undefined;
        this.clearUI();
    };
}
