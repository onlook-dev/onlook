import type { LayerNode } from '@onlook/models';
import { debounce } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class FrameEventManager {
    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    clear() { }

    async undebouncedHandleWindowMutated() {
        try {
            await this.editorEngine.refreshLayers();
            await this.editorEngine.overlay.refresh();
            await this.validateAndCleanSelections();
        } catch (error) {
            console.error('Error handling window mutation:', error);
        }
    }

    handleWindowMutated = debounce(this.undebouncedHandleWindowMutated, 1000, { leading: true, trailing: true });

    async handleWindowResized(): Promise<void> {
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
                if (!frameData?.view) {
                    console.error('No frame view found');
                    return null;
                }
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