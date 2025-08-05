'use client';

import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { EditorMode } from '@onlook/models';
import { HotkeyLabel } from '@onlook/ui/hotkey-label';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { TerminalArea } from './terminal-area';

const TOOLBAR_ITEMS = ({ t }: { t: ReturnType<typeof useTranslations> }) => [
    {
        mode: EditorMode.DESIGN,
        icon: Icons.CursorArrow,
        hotkey: Hotkey.SELECT,
        disabled: false,
        draggable: false,
        label: t(transKeys.editor.toolbar.tools.select.name),
        tooltip: t(transKeys.editor.toolbar.tools.select.tooltip),
    },
    {
        mode: EditorMode.PAN,
        icon: Icons.Hand,
        hotkey: Hotkey.PAN,
        disabled: false,
        draggable: false,
        label: t(transKeys.editor.toolbar.tools.pan.name),
        tooltip: t(transKeys.editor.toolbar.tools.pan.tooltip),
    },
    {
        mode: EditorMode.INSERT_DIV,
        icon: Icons.Square,
        hotkey: Hotkey.INSERT_DIV,
        disabled: false,
        draggable: true,
        label: t(transKeys.editor.toolbar.tools.insertDiv.name),
        tooltip: t(transKeys.editor.toolbar.tools.insertDiv.tooltip),
    },
    {
        mode: EditorMode.INSERT_TEXT,
        icon: Icons.Text,
        hotkey: Hotkey.INSERT_TEXT,
        disabled: false,
        draggable: true,
        label: t(transKeys.editor.toolbar.tools.insertText.name),
        tooltip: t(transKeys.editor.toolbar.tools.insertText.tooltip),
    },
];

export const BottomBar = observer(() => {
    const t = useTranslations();
    const editorEngine = useEditorEngine();
    const toolbarItems = TOOLBAR_ITEMS({ t });

    // Ensure default state is set
    useEffect(() => {
        if (!editorEngine.state.editorMode) {
            editorEngine.state.editorMode = EditorMode.DESIGN;
        }
    }, [editorEngine.state.editorMode]);

    return (
        <AnimatePresence mode="wait">
            <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                        opacity: editorEngine.state.editorMode !== EditorMode.PREVIEW  ? 1 : 0, 
                        y: editorEngine.state.editorMode !== EditorMode.PREVIEW  ? 0 : 20, 
                    }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-4 flex flex-col border-[0.5px] border-border p-1 px-1 bg-background rounded-lg backdrop-blur drop-shadow-xl overflow-hidden"
                    transition={{
                        type: 'spring',
                        bounce: 0.1,
                        duration: 0.4,
                        stiffness: 200,
                        damping: 25,
                    }}
                    style={{
                        pointerEvents: editorEngine.state.editorMode !== EditorMode.PREVIEW ? 'auto' : 'none',
                        visibility: editorEngine.state.editorMode !== EditorMode.PREVIEW ? 'visible' : 'hidden'
                    }}
                >
                    <TerminalArea>
                        <ToggleGroup
                            type="single"
                            value={editorEngine.state.editorMode}
                            onValueChange={(value) => {
                                if (value) {
                                    editorEngine.state.editorMode = value as EditorMode;
                                }
                            }}
                            className="gap-0.5"
                        >
                            {toolbarItems.map((item) => (
                                <Tooltip key={item.mode}>
                                    <TooltipTrigger asChild>
                                        <ToggleGroupItem
                                            value={item.mode}
                                            variant="default"
                                            aria-label={item.hotkey.description}
                                            disabled={item.disabled}
                                            className={cn(
                                                "h-9 w-9 flex items-center justify-center rounded-md border border-transparent transition-all duration-150 ease-in-out",
                                                editorEngine.state.editorMode === item.mode
                                                    ? "bg-background-tertiary/50 text-foreground-primary hover:text-foreground-primary"
                                                    : "text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50"
                                            )}
                                        >
                                            <item.icon />
                                        </ToggleGroupItem>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={5} hideArrow>
                                        <HotkeyLabel hotkey={item.hotkey} />
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </ToggleGroup>
                    </TerminalArea>
                </motion.div>
        </AnimatePresence>
    );
});
