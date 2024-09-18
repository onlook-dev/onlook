import { useEditorEngine } from '@/components/Context/Editor';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EditorMode } from '@/lib/models';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
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
        <div className="relative">
            <ToggleGroup
                className="font-normal"
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
                            <ToggleGroupItem
                                variant={'overline'}
                                value={item.mode}
                                aria-label={item.hotkey.description}
                                className={`transition-all duration-300 ease-in-out px-4 py-2 ${
                                    mode === item.mode ? 'text-white font-bold' : 'font-normal'
                                }`}
                            >
                                {capitalizeFirstLetter(item.mode)}
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <HotKeyLabel hotkey={item.hotkey} />
                        </TooltipContent>
                    </Tooltip>
                ))}
            </ToggleGroup>
            <motion.div
                className="absolute -top-1 h-0.5 bg-white"
                initial={false}
                animate={{
                    width: '50%',
                    x: mode === EditorMode.DESIGN ? '0%' : '100%',
                }}
                transition={{
                    type: 'tween',
                    ease: 'easeInOut',
                    duration: 0.3,
                }}
            />
        </div>
    );
});

export default ModeToggle;
