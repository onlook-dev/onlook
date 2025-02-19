import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { EditorMode } from '@/lib/models';
import type { DropElementProperties } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Terminal from './Terminal';
import RunButton from './Terminal/RunButton';
import { Hotkey } from '/common/hotkeys';
import { useTranslation } from 'react-i18next';

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

const Toolbar = observer(() => {
    const { t } = useTranslation();
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);
    const [terminalHidden, setTerminalHidden] = useState(true);

    useEffect(() => {
        setMode(editorEngine.mode);
    }, [editorEngine.mode]);

    const createDragPreview = (properties: DropElementProperties): HTMLElement => {
        const preview = document.createElement('div');
        Object.assign(preview.style, {
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...properties.styles,
        });

        if (properties.textContent) {
            preview.textContent = properties.textContent;
        }

        return preview;
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, mode: EditorMode) => {
        const properties = editorEngine.insert.getDefaultProperties(mode);

        e.dataTransfer.setData('text/plain', mode);
        e.dataTransfer.setData('application/json', JSON.stringify(properties));
        e.dataTransfer.effectAllowed = 'copy';

        editorEngine.mode = mode;

        // Disable pointer-events on webviews during drag
        for (const webview of editorEngine.webviews.webviews.values()) {
            webview.webview.style.pointerEvents = 'none';
        }

        const dragPreview = createDragPreview(properties);
        document.body.appendChild(dragPreview);
        e.dataTransfer.setDragImage(dragPreview, 50, 50);

        setTimeout(() => document.body.removeChild(dragPreview), 0);
    };

    const toolbarItems = TOOLBAR_ITEMS({ t });

    return (
        <AnimatePresence mode="wait">
            {editorEngine.mode !== EditorMode.PREVIEW && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex flex-col border p-1 px-1.5 bg-background/30 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl"
                    transition={{
                        type: 'spring',
                        bounce: 0.1,
                        duration: 0.4,
                        stiffness: 200,
                        damping: 25,
                    }}
                >
                    {terminalHidden ? (
                        <motion.div layout className="flex items-center gap-1">
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
                                {toolbarItems.map((item) => (
                                    <Tooltip key={item.mode}>
                                        <TooltipTrigger asChild>
                                            <div
                                                draggable={item.draggable}
                                                onDragStart={(e) => handleDragStart(e, item.mode)}
                                            >
                                                <ToggleGroupItem
                                                    value={item.mode}
                                                    aria-label={item.hotkey.description}
                                                    disabled={item.disabled}
                                                    className="hover:text-foreground-hover text-foreground-tertiary"
                                                >
                                                    <item.icon />
                                                </ToggleGroupItem>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <HotKeyLabel hotkey={item.hotkey} />
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </ToggleGroup>
                            <motion.div layout className="relative -my-1">
                                <RunButton />
                            </motion.div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setTerminalHidden(!terminalHidden)}
                                        className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded-md"
                                    >
                                        <Icons.Terminal />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Toggle Terminal</TooltipContent>
                            </Tooltip>
                        </motion.div>
                    ) : (
                        <motion.div
                            layout
                            className="flex items-center justify-between w-full mb-1"
                        >
                            <motion.span
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.7 }}
                                className="text-small text-foreground-secondary ml-2 select-none"
                            >
                                Terminal
                            </motion.span>
                            <div className="flex items-center gap-1">
                                <motion.div layout>
                                    <RunButton />
                                </motion.div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setTerminalHidden(!terminalHidden)}
                                            className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded-lg"
                                        >
                                            <Icons.ChevronDown />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Toggle Terminal</TooltipContent>
                                </Tooltip>
                            </div>
                        </motion.div>
                    )}
                    <Terminal hidden={terminalHidden} />
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default Toolbar;
