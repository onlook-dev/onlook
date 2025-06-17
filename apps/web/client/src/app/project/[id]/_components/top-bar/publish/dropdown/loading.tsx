import { useEditorEngine } from '@/components/store/editor';
import { Progress } from '@onlook/ui/progress';
import { observer } from 'mobx-react-lite';

export const LoadingState = observer(() => {
    const editorEngine = useEditorEngine();
    const state = editorEngine.hosting.state;

    return (
        <div className="p-4 flex flex-col gap-2">
            <p>{state.message}</p>
            <Progress value={state.progress} className="w-full" />
        </div>
    );
});
