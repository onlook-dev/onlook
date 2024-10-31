import { useEditorEngine } from '@/components/Context';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { observer } from 'mobx-react-lite';
import Frame from './Frame';
import Overlay from './Overlay';

const WebviewArea = observer(() => {
    console.log('WebviewArea mounting');
    const editorEngine = useEditorEngine();
    const messageBridge = new WebviewMessageBridge(editorEngine);

    console.log('WebviewArea rendering, frames:', editorEngine.canvas.frames);

    return (
        <Overlay>
            <div className="grid grid-flow-col gap-72">
                {editorEngine.canvas.frames.map((settings, index) => {
                    console.log('Rendering frame:', index, settings);
                    return <Frame key={index} settings={settings} messageBridge={messageBridge} />;
                })}
            </div>
        </Overlay>
    );
});

export default WebviewArea;
