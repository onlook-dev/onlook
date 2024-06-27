import { WebviewMessageBridge } from '@/lib/editor';
import { OverlayManager } from '@/lib/editor/overlay';
import { WebviewMetadata } from '@/lib/models';
import { ElementMetadata } from 'common/models';
import { nanoid } from 'nanoid';
import Overlay from './Overlay';
import Webview from './Webview';

export class WebviewEventHandler {
    eventCallbackMap: Record<string, (e: any) => void>

    constructor(overlayManager: OverlayManager) {
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
            },
        };
        this.handleIpcMessage = this.handleIpcMessage.bind(this);
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
}


function WebviewArea() {
    const overlayManager = new OverlayManager();
    const webviewEventHandler = new WebviewEventHandler(overlayManager);
    const webviewMessageBridge = new WebviewMessageBridge(webviewEventHandler);
    const webviews: WebviewMetadata[] = [
        {
            id: nanoid(),
            title: 'Desktop',
            src: 'https://www.framer.com/',
        },
    ];

    return (
        <Overlay overlayManager={overlayManager}>
            <div className='grid grid-flow-col gap-96'>
                {webviews.map((metadata, index) => (
                    <Webview key={index} metadata={metadata} webviewMessageBridge={webviewMessageBridge} />
                ))}
            </div>
        </Overlay>
    );
}

export default WebviewArea;
