import { ElementMetadata } from 'common/models';
import { EditorEngine } from './engine';

export class WebviewEventHandler {
    eventCallbackMap: Record<string, (e: any) => void>
    editorEngine: EditorEngine;

    constructor(editorEngine: EditorEngine) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);
        this.editorEngine = editorEngine;

        this.eventCallbackMap = {
            'mouseover': this.handleMouseover(),
            'click': this.handleClick(),
            'wheel': this.handleScroll(),
            'scroll': this.handleScroll()
        };
    }

    handleScroll() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const sourceWebview = e.target as Electron.WebviewTag;

            // TODO: Move this logic into the engine
            this.editorEngine.overlay.clear();
            const clickedSelectors = this.editorEngine.state.selected;
            clickedSelectors.forEach(async (selector) => {
                const rect = await this.editorEngine.overlay.getRectFromSelector(selector, sourceWebview);
                const computedStyle = await this.editorEngine.overlay.getComputedStyleFromSelector(selector, sourceWebview);
                const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(rect, sourceWebview);
                this.editorEngine.overlay.addClickRect(adjustedRect, computedStyle);
            });
        };
    }

    handleMouseover() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const sourceWebview = e.target as Electron.WebviewTag;
            const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);

            // TODO: Move this logic into the engine
            const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(elementMetadata.rect, sourceWebview);
            this.editorEngine.overlay.updateHoverRect(adjustedRect);
            this.editorEngine.state.setHoveredElement(elementMetadata.selector);
        };
    }

    handleClick() {
        return (e: Electron.IpcMessageEvent) => {
            if (!e.args || e.args.length === 0) {
                console.error('No args found for mouseover event');
                return;
            }

            const sourceWebview = e.target as Electron.WebviewTag;
            const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);

            // TODO: Move this logic into the engine
            const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(elementMetadata.rect, sourceWebview);
            this.editorEngine.overlay.removeClickedRects();
            this.editorEngine.overlay.addClickRect(adjustedRect, elementMetadata.computedStyle);
            this.editorEngine.state.clearSelectedElements();
            this.editorEngine.state.addSelectedElement(elementMetadata.selector);
        };
    }

    handleIpcMessage(e: Electron.IpcMessageEvent) {
        const eventHandler = this.eventCallbackMap[e.channel]
        if (!eventHandler) {
            console.error(`No event handler found for ${e.channel}`);
            return;
        }
        eventHandler(e);
    }

    handleConsoleMessage(e: Electron.ConsoleMessageEvent) {
        console.log(`%c ${e.message}`, 'background: #000; color: #AAFF00');
    }
}
