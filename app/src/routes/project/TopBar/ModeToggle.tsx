import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EditorMode } from '@/lib/editor/engine';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useEditorEngine } from '..';

const ModeToggle = observer(() => {
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);

    return (
        <ToggleGroup
            className="h-6 my-auto font-normal "
            type="single"
            value={mode}
            onValueChange={(value) => {
                if (value) {
                    editorEngine.mode = value as EditorMode;
                    setMode(value as EditorMode);
                }
            }}
        >
            <ToggleGroupItem
                variant={'underline'}
                value={EditorMode.Design}
                aria-label={EditorMode.Design + ' Mode'}
            >
                {EditorMode.Design}
            </ToggleGroupItem>
            <ToggleGroupItem
                variant={'underline'}
                value={EditorMode.Interact}
                aria-label={EditorMode.Interact + ' Mode'}
            >
                {EditorMode.Interact}
            </ToggleGroupItem>
        </ToggleGroup>
    );
});

export default ModeToggle;
