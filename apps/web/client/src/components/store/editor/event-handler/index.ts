import { FrameViewEvents, type FrameViewEventPayload } from "@onlook/constants";
import { EditorEngine } from "../engine";
import { EditorMode, type DomElement, type LayerNode } from "@onlook/models";

import { debounce } from "lodash";


export class FrameViewEventHandler {
    constructor(private editorEngine: EditorEngine) { }

    async handleEvents(event: FrameViewEventPayload) {
        const { action, args } = event;
        switch (action) {
            case FrameViewEvents.DOM_PROCESSED: {
                const { frameId, layerMap, rootNode } = args;
                return this.handleDomProcessed(frameId, layerMap, rootNode);
            }
            case FrameViewEvents.UPDATE_STYLE: {
                const { domEl } = args;
                return this.handleUpdateStyle(domEl);

            }
            case FrameViewEvents.MOVE_ELEMENT: {
                const { domEl, layerMap } = args;
                return this.handleMoveElement(domEl, layerMap);
            }
            case FrameViewEvents.EDIT_ELEMENT_TEXT: {
                const {domEl , layerMap} = args;
                return this.handleEditText(domEl, layerMap);
            }
            case FrameViewEvents.GROUP_ELEMENTS: {
                const { domEl, layerMap } = args;
                return this.handleGroupElements(domEl, layerMap);
            }
            case FrameViewEvents.UNGROUP_ELEMENTS: {
                const { parentEl, layerMap } = args;
                return this.handleUngroupElements(parentEl, layerMap);
            }
            case FrameViewEvents.INSERT_ELEMENT: {
                const { domEl, layerMap, editText } = args;
                return this.handleInsertElement(domEl, layerMap, editText);
            }
            case FrameViewEvents.REMOVE_ELEMENT: {
                const { parentDomEl, layerMap } = args;
                return this.handleRemoveElement(parentDomEl, layerMap);
            }
            case FrameViewEvents.WINDOW_MUTATED: {
                const { frameId, added, removed } = args;
                return this.handleWindowMutated(frameId, added, removed);
            }
        }
    }

    async debouncedHandleWindowMutated(frameId: string, added: Record<string, LayerNode>, removed: Record<string, LayerNode>) {
        const frameData = this.editorEngine.frames.get(frameId);
        if(!frameData) {
            console.error('Failed to get frame data for window mutated');
            return;
        }
        await this.editorEngine.ast.refreshAstDoc(frameData.view);
        const newMap = new Map([...Object.entries(added), ...Object.entries(removed)]);
        await this.editorEngine.ast.updateMap(frameId, newMap, null);
    }

    async handleWindowMutated(frameId: string, added: Record<string, LayerNode>, removed: Record<string, LayerNode>) {
        const debouncedHandler = debounce(this.debouncedHandleWindowMutated, 1000, { leading: true, trailing: true });
        debouncedHandler(frameId, added, removed);
    }

    async handleDomProcessed(frameId: string, layerMap: Record<string, LayerNode>, rootNode: LayerNode) {
        console.log('handleDomProcessed called for frame:', frameId);
        
        if (!layerMap || !rootNode) {
            console.error('No layerMap or rootNode found for DOM processed event');
            return;
        }
        const processedLayerMap = new Map(Object.entries(layerMap));
        
        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData) {
            console.error('Failed to get frame data for DOM processed');
            return;
        }

        
        const body = this.editorEngine.ast.getBodyFromFrameView(frameData.view);
        
        this.editorEngine.ast.setMapRoot(frameId, body, rootNode, processedLayerMap);
        
        console.log('Layer tree processed successfully:', {
            frameId,
            layerCount: processedLayerMap.size,
            rootNode: rootNode.domId
        });
    }

    debouncedRefreshDomElement(domEls: DomElement[]) {
        this.editorEngine.elements.click(domEls);
    }

    refreshDomElement = debounce(this.debouncedRefreshDomElement, 100, { leading: true });

    async handleUpdateStyle(domEl: DomElement) {
        console.log('---we are in the handleUpdateStyle---')
        if (!domEl) {
            console.warn('No domEl found for update style event');
            return;
        }
        this.refreshDomElement([domEl]);
    }

    async handleMoveElement(domEl: DomElement, layerMap: Map<string, LayerNode>) {
        console.log('---we are in the handleMoveElement---')
        if (!domEl) {
            console.warn('No domEl found for move element event');
            return;
        }
        this.refreshAndClickMutatedElement(domEl, layerMap);
    }

    async handleEditText(domEl: DomElement, layerMap: Map<string, LayerNode>) {
        console.log('---we are in the handleEditText---')
        if (!domEl || !layerMap) {
            console.warn('No domEl or layerMap found for edit text event');
            return;
        }
        this.refreshAndClickMutatedElement(domEl, layerMap);
    }


    async handleInsertElement(domEl: DomElement, layerMap: Map<string, LayerNode>, editText: boolean) {
        console.log('---we are in the handleInsertElement---')
        if (!domEl || !layerMap) {
            console.warn('No domEl or layerMap found for insert element event');
            return;
        }
        this.refreshAndClickMutatedElement(domEl, layerMap);

        const frameView = this.editorEngine.frames.get(domEl.frameId)?.view;
        if (editText && frameView) {
            this.editorEngine.text.start(domEl, frameView);
        }
    }

    async handleRemoveElement(parentDomEl: DomElement, layerMap: Map<string, LayerNode>) {
        console.log('---we are in the handleRemoveElement---')
        if (!parentDomEl || !layerMap) {
            console.warn('No parentDomEl or layerMap found for remove element event');
            return;
        }

        await this.editorEngine.overlay.refresh();

        this.refreshAndClickMutatedElement(parentDomEl, layerMap);
    }

    async handleGroupElements(domEl: DomElement, layerMap: Map<string, LayerNode>) {
        if (!domEl || !layerMap) {
            console.warn('No domEl or layerMap found for group element event');
            return;
        }

        this.refreshAndClickMutatedElement(domEl, layerMap);
    }


    async handleUngroupElements(parentEl: DomElement, layerMap: Map<string, LayerNode>) { 
        console.log('---we are in the handleUngroupElements---')
        if (!parentEl || !layerMap) {
            console.warn('No parentEl or layerMap found for ungroup element event');
            return;
        }

        this.refreshAndClickMutatedElement(parentEl, layerMap);
    }


    async refreshAndClickMutatedElement(
        domEl: DomElement,  
        newMap?: Map<string, LayerNode>,
    ) {
        console.log('refreshAndClickMutatedElement', domEl);
        this.editorEngine.state.editorMode = EditorMode.DESIGN;
        
        // Get frame data
        const frameData = this.editorEngine.frames.get(domEl.frameId);
        console.log({frameData});
        if (frameData) {
            // Refresh AST document if available
            this.editorEngine.ast.refreshAstDoc(frameData.view);
        }
        
        // Click the element
        this.editorEngine.elements.click([domEl]);
        
        // Update layer map if provided
        if (newMap && frameData) {
            this.editorEngine.ast.updateMap(domEl.frameId, newMap, domEl.domId);
            console.log('Layer map updated for element:', domEl.domId);
        }
    }
}