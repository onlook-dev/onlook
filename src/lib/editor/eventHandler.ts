import { ElementMetadata } from 'common/models';
import { OverlayManager } from './overlay';

export class WebviewEventHandler {
    eventCallbackMap: Record<string, (e: any) => void>

    constructor(overlayManager: OverlayManager) {
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
        this.handleConsoleMessage = this.handleConsoleMessage.bind(this);

        this.eventCallbackMap = {
            'mouseover': (e: Electron.IpcMessageEvent) => {
                if (!e.args || e.args.length === 0) {
                    console.error('No args found for mouseover event');
                    return;
                }

                const sourceWebview = e.target as Electron.WebviewTag;
                const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);
                const adjustedRect = overlayManager.adaptRectFromSourceElement(elementMetadata.rect, sourceWebview);
                overlayManager.updateHoverRect(adjustedRect);
            },
            'click': (e: Electron.IpcMessageEvent) => {
                if (!e.args || e.args.length === 0) {
                    console.error('No args found for mouseover event');
                    return;
                }

                const sourceWebview = e.target as Electron.WebviewTag;
                const elementMetadata: ElementMetadata = JSON.parse(e.args[0]);
                const adjustedRect = overlayManager.adaptRectFromSourceElement(elementMetadata.rect, sourceWebview);
                overlayManager.removeClickedRects();
                overlayManager.addClickRect(adjustedRect, elementMetadata.computedStyle);
                console.log('click', elementMetadata);
            },
            'wheel': (e: Electron.IpcMessageEvent) => {
                if (!e.args || e.args.length === 0) {
                    console.error('No args found for mouseover event');
                    return;
                }
                const scrollPosition: { x: number, y: number } = JSON.parse(e.args[0]);
                overlayManager.updateScroll(scrollPosition);
            },
        };

    }

    handleIpcMessage(e: Electron.IpcMessageEvent) {
        console.log('ipc-message', e);
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

