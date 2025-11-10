import { observer } from 'mobx-react-lite';

import { EditorMode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { CodePanel } from './code-panel';
import { DesignPanel } from './design-panel';

interface LeftPanelProps {
    onClose?: () => void;
}

export const LeftPanel = observer(({ onClose }: LeftPanelProps) => {
    const editorEngine = useEditorEngine();
    return (
        <>
            <div
                className={cn(
                    'size-full',
                    editorEngine.state.editorMode !== EditorMode.DESIGN &&
                        editorEngine.state.editorMode !== EditorMode.PAN &&
                        'hidden',
                )}
            >
                <DesignPanel onClose={onClose} />
            </div>
            <div
                className={cn(
                    'size-full',
                    editorEngine.state.editorMode !== EditorMode.CODE && 'hidden',
                )}
            >
                <CodePanel />
            </div>
        </>
    );
});
