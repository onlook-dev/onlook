import { EditorEngine } from '@/lib/editor/engine';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';
import { nanoid } from 'nanoid';
import Overlay from './Overlay';
import Webview from './Webview';

function WebviewArea({ editorEngine }: { editorEngine: EditorEngine }) {
    const messageBridge = new WebviewMessageBridge(editorEngine);
    const webviews: WebviewMetadata[] = [
        {
            id: nanoid(),
            title: 'Desktop',
            src: 'https://www.github.com/',
        },
    ];

    return (
        <Overlay editorEngine={editorEngine}>
            <div className='grid grid-flow-col gap-96'>
                {webviews.map((metadata, index) => (
                    <Webview key={index} metadata={metadata} messageBridge={messageBridge} />
                ))}
            </div>
        </Overlay>
    );
}

export default WebviewArea;
