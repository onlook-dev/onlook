import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EditorMode } from '@/lib/models';
import { CursorArrowIcon, HandIcon, SquareIcon, TextIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '..';

const Toolbar = observer(() => {
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);

    useEffect(() => {
        setMode(editorEngine.mode);
    }, [editorEngine.mode]);

    return (
        <div
            className={clsx(
                'border p-1 flex bg-black/80 backdrop-blur rounded-lg shadow items-center justify-center',
                editorEngine.mode === EditorMode.Interact ? 'hidden' : 'visible',
            )}
        >
            <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                    if (value) {
                        editorEngine.mode = value as EditorMode;
                        setMode(value as EditorMode);
                    }
                }}
            >
                <ToggleGroupItem value={EditorMode.Design} aria-label={EditorMode.Design + ' Mode'}>
                    <CursorArrowIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value={EditorMode.Pan} aria-label={EditorMode.Pan + ' Mode'}>
                    <HandIcon />
                </ToggleGroupItem>
                <ToggleGroupItem
                    disabled={true}
                    value={EditorMode.InsertText}
                    aria-label={EditorMode.InsertText + ' Mode'}
                >
                    <TextIcon />
                </ToggleGroupItem>
                <ToggleGroupItem
                    disabled={true}
                    value={EditorMode.InsertDiv}
                    aria-label={EditorMode.InsertDiv + ' Mode'}
                >
                    <SquareIcon />
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
});

export default Toolbar;
