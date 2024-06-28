import { WebviewEventHandler } from '@/lib/editor/eventHandler';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { OverlayManager } from '@/lib/editor/overlay';
import { WebviewMetadata } from '@/lib/models';
import { nanoid } from 'nanoid';
import Overlay from './Overlay';
import Webview from './Webview';

function WebviewArea() {
    const overlayManager = new OverlayManager();
    const webviewEventHandler = new WebviewEventHandler(overlayManager);
    const webviewMessageBridge = new WebviewMessageBridge(webviewEventHandler);
    const webviews: WebviewMetadata[] = [
        {
            id: nanoid(),
            title: 'Desktop',
            src: 'https://www.github.com/',
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
