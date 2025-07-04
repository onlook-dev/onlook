import type { LayerNode } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export enum FrameViewEvents {
    DOM_PROCESSED = 'dom-processed',
    WINDOW_MUTATED = 'window-mutated',
    WINDOW_RESIZED = 'window-resized',
}

export interface FrameViewEventHandler {
    [FrameViewEvents.DOM_PROCESSED]: {
        frameId: string;
        layerMap: Record<string, LayerNode>;
        rootNode: LayerNode;
    };
    [FrameViewEvents.WINDOW_MUTATED]: {
        frameId: string;
        added: Record<string, LayerNode>;
        removed: Record<string, LayerNode>;
    };
    [FrameViewEvents.WINDOW_RESIZED]: {};
}

export type FrameViewEventPayload = {
    action: FrameViewEvents;
    args: any;
};

export class FrameViewEventHandlerManager {
    private debouncedHandlers: (() => void)[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    clear() {
    }

    handleWindowMutated() {
        const handler = async () => {
            try {
                await this.editorEngine.refreshLayers();
                await this.editorEngine.overlay.refresh();
                await this.validateAndCleanSelections();
            } catch (error) {
                console.error('Error handling window mutation:', error);
            }
        }
        const debouncedHandler = debounce(handler, 1000, { leading: true, trailing: true });
        this.debouncedHandlers.push(() => debouncedHandler.cancel());
        return debouncedHandler;

    }

    async handleWindowResized(frameId: string): Promise<void> {
        try {
            await this.editorEngine.overlay.refresh();
        } catch (error) {
            console.error('Error handling window resize:', error);
        }
    }

    async handleDomProcessed(frameId: string, data: { layerMap: Record<string, LayerNode>; rootNode: LayerNode }): Promise<void> {
        try {
            const layerMapConverted = new Map(Object.entries(data.layerMap)) as Map<string, LayerNode>;

            const frameData = this.editorEngine.frames.get(frameId);
            if (!frameData) {
                console.warn('Frame not found for DOM processing');
                return;
            }

            this.editorEngine.ast.setMapRoot(frameId, data.rootNode, layerMapConverted);
            await this.editorEngine.overlay.refresh();
        } catch (error) {
            console.error('Error handling DOM processed:', error);
        }
    }

    private async validateAndCleanSelections(): Promise<void> {
        const selectedElements = this.editorEngine.elements.selected;
        const stillValidElements = await Promise.all(
            selectedElements.map(async (el) => {
                const frameData = this.editorEngine.frames.get(el.frameId);
                if (!frameData) return null;
                try {
                    const domEl = await frameData.view.getElementByDomId(el.domId, false);
                    return domEl ? el : null;
                } catch {
                    return null;
                }
            })
        );

        const validElements = stillValidElements.filter((el): el is typeof selectedElements[0] => el !== null);
        if (validElements.length !== selectedElements.length) {
            this.editorEngine.elements.click(validElements);
        }
    }
} 