'use client';

import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { EditorMode, LeftPanelTabValue } from '@onlook/models';
import { HotkeyLabel } from '@onlook/ui/hotkey-label';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { TerminalArea } from './terminal-area';

const TOOLBAR_ITEMS = ({ t }: { t: (key: string) => string }) => [
    {
        mode: EditorMode.DESIGN,
        icon: Icons.CursorArrow,
        hotkey: Hotkey.SELECT,
        disabled: false,
        draggable: false,
        label: t('editor.toolbar.tools.select.name'),
        tooltip: t('editor.toolbar.tools.select.tooltip'),
    },
    {
        mode: EditorMode.PAN,
        icon: Icons.Hand,
        hotkey: Hotkey.PAN,
        disabled: false,
        draggable: false,
        label: t('editor.toolbar.tools.pan.name'),
        tooltip: t('editor.toolbar.tools.pan.tooltip'),
    },
    {
        mode: EditorMode.INSERT_DIV,
        icon: Icons.Square,
        hotkey: Hotkey.INSERT_DIV,
        disabled: false,
        draggable: true,
        label: t('editor.toolbar.tools.insertDiv.name'),
        tooltip: t('editor.toolbar.tools.insertDiv.tooltip'),
    },
    {
        mode: EditorMode.INSERT_TEXT,
        icon: Icons.Text,
        hotkey: Hotkey.INSERT_TEXT,
        disabled: false,
        draggable: true,
        label: t('editor.toolbar.tools.insertText.name'),
        tooltip: t('editor.toolbar.tools.insertText.tooltip'),
    },
];

export const BottomBar = observer(() => {
    const t = useTranslations();
    const editorEngine = useEditorEngine();
    const toolbarItems = TOOLBAR_ITEMS({ t });

    const addWindowItem = {
        icon: Icons.Desktop,
        hotkey: Hotkey.ADD_WINDOW,
        label: t('editor.toolbar.tools.addWindow.name'),
        tooltip: t('editor.toolbar.tools.addWindow.tooltip'),
    };
    const selected = editorEngine.frames.selected;

    const addWindowFunc = async () => {
        if (selected.length > 0) {
            const frameId = selected[0]?.frame.id;
            if (frameId) {
                editorEngine.frames.duplicate(frameId);
            }
        }
        editorEngine.state.leftPanelTab = LeftPanelTabValue.WINDOWS;
    };

    return (
        <AnimatePresence mode="wait">
            {editorEngine.state.editorMode !== EditorMode.PREVIEW && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex flex-col border p-1 px-1.5 bg-background-secondary/85 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl"
                    transition={{
                        type: 'spring',
                        bounce: 0.1,
                        duration: 0.4,
                        stiffness: 200,
                        damping: 25,
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
                        >
                            {toolbarItems.map((item) => (
                                <Tooltip key={item.mode}>
                                    <TooltipTrigger asChild>
                                        <ToggleGroupItem
                                            value={item.mode}
                                            aria-label={item.hotkey.description}
                                            disabled={item.disabled}
                                            className="hover:text-foreground-hover text-foreground-tertiary"
                                        >
                                            <item.icon />
                                        </ToggleGroupItem>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <HotkeyLabel hotkey={item.hotkey} />
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </ToggleGroup>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    aria-label={addWindowItem.hotkey.description}
                                    disabled={selected.length === 0 || !selected[0]}
                                    className="hover:text-foreground-hover text-foreground-tertiary p-1"
                                    onClick={addWindowFunc}
                                >
                                    <addWindowItem.icon />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <HotkeyLabel hotkey={addWindowItem.hotkey} />
                            </TooltipContent>
                        </Tooltip>
                    </TerminalArea>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
