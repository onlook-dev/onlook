import { WebviewMetadata } from '@/lib/webview/models';
import { nanoid } from 'nanoid';
import Webview from './Webview';

function WebviewArea() {
    const webviews: WebviewMetadata[] = [
        {
            id: nanoid(),
            src: 'https://www.framer.com/',
        },
        {
            id: nanoid(),
            src: 'https://www.github.com/',
        },
    ];

    return (
        <div className='grid grid-flow-col gap-96'>
            {webviews.map((metadata, index) => (
                <Webview key={index} metadata={metadata} />
            ))}
        </div>
    );
}

export default WebviewArea;
