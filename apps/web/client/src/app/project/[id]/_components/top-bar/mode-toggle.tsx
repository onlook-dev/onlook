import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { EditorMode } from '@onlook/models';
import { HotkeyLabel } from '@onlook/ui/hotkey-label';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

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

export const ModeToggle = observer(() => {
    const t = useTranslations();
    const editorEngine = useEditorEngine();
    const mode: EditorMode.DESIGN | EditorMode.PREVIEW = getNormalizedMode(
        editorEngine.state.editorMode,
    );

    function getNormalizedMode(unnormalizedMode: EditorMode) {
        return unnormalizedMode === EditorMode.PREVIEW ? EditorMode.PREVIEW : EditorMode.DESIGN;
    }

    return (
        <div className="relative">
            <ToggleGroup
                className="font-normal h-7 mt-1"
                type="single"
                value={mode}
                onValueChange={(value) => {
                    if (value) {
                        editorEngine.state.editorMode = value as EditorMode;
                    }
                }}
            >
                {MODE_TOGGLE_ITEMS.map((item) => (
                    <Tooltip key={item.mode}>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem
                                value={item.mode}
                                aria-label={item.hotkey.description}
                                className={cn(
                                    'transition-all duration-150 ease-in-out px-4 py-2 whitespace-nowrap bg-transparent cursor-pointer text-sm',
                                    mode === item.mode
                                        ? 'text-active text-sm hover:text-active hover:bg-transparent'
                                        : 'text-foreground-secondary text-sm hover:text-foreground-hover hover:bg-transparent',
                                )}
                            >
                                {t(transKeys.editor.modes[item.mode.toLowerCase() as keyof typeof transKeys.editor.modes].name)}
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
});
