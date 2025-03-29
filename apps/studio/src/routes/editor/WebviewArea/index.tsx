import { useEditorEngine } from '@/components/Context';
import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { observer } from 'mobx-react-lite';
import Frame from './Frame';

export const WebviewArea = observer(() => {
    const editorEngine = useEditorEngine();
    const messageBridge = new WebviewMessageBridge(editorEngine);
    return (
        <div className="grid grid-flow-col gap-72">
            {editorEngine.canvas.frames.map((settings, index) => (
                <Frame key={index} settings={settings} messageBridge={messageBridge} />
            ))}
        </div>
    );
});
