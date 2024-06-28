import { ElementMetadata } from 'common/models';
import { ElementManager } from './elementManager';
import { OverlayManager } from './overlay';

export class WebviewEventHandler {
    eventCallbackMap: Record<string, (e: any) => void>
    overlayManager: OverlayManager;
    elementManager: ElementManager;

    constructor(overlayManager: OverlayManager, elementManager: ElementManager) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);
        this.overlayManager = overlayManager;
        this.elementManager = elementManager;
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
            this.overlayManager.clear();
            const sourceWebview = e.target as Electron.WebviewTag;
            const clickedSelectors = this.elementManager.selected;
            clickedSelectors.forEach(async (selector) => {
                const rect = await this.overlayManager.getRectFromSelector(selector, sourceWebview);
                const computedStyle = await this.overlayManager.getComputedStyleFromSelector(selector, sourceWebview);
                const adjustedRect = this.overlayManager.adaptRectFromSourceElement(rect, sourceWebview);
                this.overlayManager.addClickRect(adjustedRect, computedStyle);
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
            const adjustedRect = this.overlayManager.adaptRectFromSourceElement(elementMetadata.rect, sourceWebview);

            this.overlayManager.updateHoverRect(adjustedRect);
            this.elementManager.setHoveredElement(elementMetadata.selector);
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
            const adjustedRect = this.overlayManager.adaptRectFromSourceElement(elementMetadata.rect, sourceWebview);

            this.overlayManager.removeClickedRects();
            this.overlayManager.addClickRect(adjustedRect, elementMetadata.computedStyle);
            this.elementManager.clearSelectedElements();
            this.elementManager.addSelectedElement(elementMetadata.selector);
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
