import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '..';

const ModeToggle = observer(() => {
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(makeDesignMode(editorEngine.mode));

    useEffect(() => {
        setMode(makeDesignMode(editorEngine.mode));
    }, [editorEngine.mode]);

    function makeDesignMode(mode: EditorMode) {
        return mode === EditorMode.INTERACT ? EditorMode.INTERACT : EditorMode.DESIGN;
    }

    return (
        <ToggleGroup
            className="font-normal -mt-2"
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
                variant={'overline'}
                value={EditorMode.DESIGN}
                aria-label={EditorMode.DESIGN + ' Mode'}
            >
                Design
            </ToggleGroupItem>
            <ToggleGroupItem
                variant={'overline'}
                value={EditorMode.INTERACT}
                aria-label={EditorMode.INTERACT + ' Mode'}
            >
                Interact
            </ToggleGroupItem>
        </ToggleGroup>
    );
});

export default ModeToggle;
