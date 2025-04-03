// import { useEditorEngine } from '@/components/Context';
// import { EditorMode } from '@/lib/models';
import { Hotkey } from '@/components/hotkey';
import { EditorMode } from '@onlook/models/editor';
import { HotkeyLabel } from '@onlook/ui-v4/hotkey-label';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui-v4/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui-v4/tooltip';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const ModeToggle = () => {
    // const editorEngine = useEditorEngine();
    const t = useTranslations();
    // TODO: Use editorEngine.mode
    const [mode, setMode] = useState<EditorMode>(getMode(EditorMode.DESIGN));

    // useEffect(() => {
    //     setMode(makeDesignMode(editorEngine.mode));
    // }, [editorEngine.mode]);

    const MODE_TOGGLE_ITEMS: {
        mode: EditorMode;
        hotkey: Hotkey;
    }[] = [
            {
                mode: EditorMode.DESIGN,
                hotkey: Hotkey.SELECT,
            },
            {
                mode: EditorMode.PREVIEW,
                hotkey: Hotkey.PREVIEW,
            },
        ];

    function getMode(mode: EditorMode) {
        return mode === EditorMode.PREVIEW ? EditorMode.PREVIEW : EditorMode.DESIGN;
    }

    return (
        <div className="relative">
            <ToggleGroup
                className="font-normal h-7 mt-1"
                type="single"
                value={mode}
                onValueChange={(value) => {
                    if (value) {
                        // editorEngine.mode = value as EditorMode;
                        setMode(value as EditorMode);
                    }
                }}
            >
                {MODE_TOGGLE_ITEMS.map((item) => (
                    <Tooltip key={item.mode}>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem
                                variant={'custom-overline'}
                                value={item.mode}
                                aria-label={item.hotkey.description}
                                className={`transition-all duration-150 ease-in-out px-4 py-2 whitespace-nowrap ${mode === item.mode
                                    ? 'text-active font-medium hover:text-active'
                                    : 'font-normal hover:text-foreground-hover'
                                    }`}
                            >
                                {t(`editor.modes.${item.mode.toLowerCase()}.name`)}
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <HotkeyLabel hotkey={item.hotkey} />
                        </TooltipContent>
                    </Tooltip>
                ))}
            </ToggleGroup>
            <motion.div
                className="absolute -top-1 h-0.5 bg-foreground"
                initial={false}
                animate={{
                    width: '50%',
                    x: mode === EditorMode.DESIGN ? '0%' : '100%',
                }}
                transition={{
                    type: 'tween',
                    ease: 'easeInOut',
                    duration: 0.2,
                }}
            />
        </div>
    );
};
