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
    hotkey?: Hotkey;
}[] = [
        {
            mode: EditorMode.DESIGN,
            hotkey: Hotkey.SELECT,
        },
        {
            mode: EditorMode.CODE,
        },
        {
            mode: EditorMode.PREVIEW,
            hotkey: Hotkey.PREVIEW,
        },
    ];

export const ModeToggle = observer(() => {
    const t = useTranslations();
    const editorEngine = useEditorEngine();
    const mode: EditorMode.DESIGN | EditorMode.CODE | EditorMode.PREVIEW = getNormalizedMode(
        editorEngine.state.editorMode,
    );

    function getNormalizedMode(unnormalizedMode: EditorMode) {
        if (unnormalizedMode === EditorMode.PREVIEW) return EditorMode.PREVIEW;
        if (unnormalizedMode === EditorMode.CODE) return EditorMode.CODE;
        return EditorMode.DESIGN;
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
                    item.hotkey ? (
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
                                    {item.mode === EditorMode.CODE ? 'Code' : t(transKeys.editor.modes[item.mode.toLowerCase() as keyof typeof transKeys.editor.modes].name)}
                                </ToggleGroupItem>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <HotkeyLabel hotkey={item.hotkey} />
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <ToggleGroupItem
                            key={item.mode}
                            value={item.mode}
                            aria-label={`${item.mode} mode`}
                            className={cn(
                                'transition-all duration-150 ease-in-out px-4 py-2 whitespace-nowrap bg-transparent cursor-pointer text-sm',
                                mode === item.mode
                                    ? 'text-active text-sm hover:text-active hover:bg-transparent'
                                    : 'text-foreground-secondary text-sm hover:text-foreground-hover hover:bg-transparent',
                            )}
                        >
                            {item.mode === EditorMode.CODE ? 'Code' : t(transKeys.editor.modes[item.mode.toLowerCase() as keyof typeof transKeys.editor.modes].name)}
                        </ToggleGroupItem>
                    )
                ))}
            </ToggleGroup>
            <motion.div
                className="absolute -top-1 h-0.5 bg-foreground"
                initial={false}
                animate={{
                    width: '33.33%',
                    x: mode === EditorMode.DESIGN ? '0%' : mode === EditorMode.CODE ? '100%' : '200%',
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
