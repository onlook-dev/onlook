import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';
import { capitalizeFirstLetter } from '/common/helpers';
import { Hotkey } from '/common/hotkeys';

const MODE_TOGGLE_ITEMS: {
    mode: EditorMode;
    hotkey: Hotkey;
}[] = [
    {
        mode: EditorMode.DESIGN,
        hotkey: Hotkey.SELECT,
    },
    {
        mode: EditorMode.INTERACT,
        hotkey: Hotkey.INTERACT,
    },
];

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
            {MODE_TOGGLE_ITEMS.map((item) => (
                <Tooltip key={item.mode}>
                    <TooltipTrigger asChild>
                        <div>
                            <ToggleGroupItem
                                variant={'overline'}
                                value={item.mode}
                                aria-label={item.hotkey.description}
                            >
                                {capitalizeFirstLetter(item.mode)}
                            </ToggleGroupItem>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <HotKeyLabel hotkey={item.hotkey} />
                    </TooltipContent>
                </Tooltip>
            ))}
        </ToggleGroup>
    );
});

export default ModeToggle;
