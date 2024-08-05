import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EditorMode } from '@/lib/editor/engine';
import {
    ChatBubbleIcon,
    CursorArrowIcon,
    HandIcon,
    SquareIcon,
    TextIcon,
} from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useEditorEngine } from '..';

const Toolbar = observer(() => {
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);

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
                <ToggleGroupItem
                    value={EditorMode.Interact}
                    aria-label={EditorMode.Interact + ' Mode'}
                >
                    <HandIcon />
                </ToggleGroupItem>

                <ToggleGroupItem
                    value={EditorMode.Interact}
                    aria-label={EditorMode.Interact + ' Mode'}
                >
                    <TextIcon />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value={EditorMode.Interact}
                    aria-label={EditorMode.Interact + ' Mode'}
                >
                    <SquareIcon />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value={EditorMode.Interact}
                    aria-label={EditorMode.Interact + ' Mode'}
                >
                    <ChatBubbleIcon />
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
});

export default Toolbar;
