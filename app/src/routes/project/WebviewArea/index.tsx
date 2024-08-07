import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';
import { nanoid } from 'nanoid';
import { useEditorEngine } from '..';
import Frame from './Frame';
import Overlay from './Overlay';

function WebviewArea() {
    const editorEngine = useEditorEngine();
    const messageBridge = new WebviewMessageBridge(editorEngine);
    const webviews: WebviewMetadata[] = [
        {
            id: nanoid(),
            title: 'Desktop',
            src: 'https://www.google.com/search?sca_esv=1926c2955f272b3e&q=sport+climbing+combined+olympics&oi=ddle&ct=348046009&hl=en&sa=X&ved=0ahUKEwiwnP6C2OOHAxUGE1kFHVBcBAgQPQgE&biw=1536&bih=960&dpr=2',
        },
    ];

    return (
        <Overlay>
            <div className="grid grid-flow-col gap-72">
                {webviews.map((metadata, index) => (
                    <Frame key={index} metadata={metadata} messageBridge={messageBridge} />
                ))}
            </div>
        </Overlay>
    );
}

export default WebviewArea;
