import { EditorManager as WebviewManager } from '@/lib/editor';
import { WebviewMetadata } from '@/lib/models';
import { nanoid } from 'nanoid';
import Webview from './Webview';

function WebviewArea() {
    const webviewManager = new WebviewManager();
    const webviews: WebviewMetadata[] = [
        {
            id: nanoid(),
            title: 'Desktop',
            src: 'https://www.framer.com/',
        },
    ];

    return (
        <div className='grid grid-flow-col gap-96'>
            {webviews.map((metadata, index) => (
                <Webview key={index} metadata={metadata} webviewManager={webviewManager} />
            ))}
        </div>
    );
}

export default WebviewArea;
