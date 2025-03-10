import { useEditorEngine } from '@/components/Context';
import { IframeMessageBridge } from '@/lib/editor/iframeMessageBridge';
import { observer } from 'mobx-react-lite';
import Frame from './Frame';

const WebviewArea = observer(() => {
    const editorEngine = useEditorEngine();
    const messageBridge = new IframeMessageBridge(editorEngine);
    return (
        <div className="grid grid-flow-col gap-72">
            {editorEngine.canvas.frames.map((settings, index) => (
                <Frame key={index} settings={settings} messageBridge={messageBridge} />
            ))}
        </div>
    );
});

export default WebviewArea;
