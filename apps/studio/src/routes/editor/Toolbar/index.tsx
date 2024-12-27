import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { EditorMode } from '@/lib/models';
import type { DropElementProperties } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@onlook/ui/utils';
import Terminal from './Terminal';
import RunButton from './Terminal/RunButton';
import { Hotkey } from '/common/hotkeys';

const TOOLBAR_ITEMS: {
    mode: EditorMode;
    icon: React.FC<{ className?: string }>;
    hotkey: Hotkey;
    disabled: boolean;
    draggable: boolean;
    showChevron?: boolean;
    dropdownItems?: Array<{
        mode: EditorMode;
        icon: React.FC<{ className?: string }>;
        label: string;
        draggable: boolean;
    }>;
}[] = [
    {
        mode: EditorMode.DESIGN,
        icon: Icons.CursorArrow,
        hotkey: Hotkey.SELECT,
        disabled: false,
        draggable: false,
    },
    {
        mode: EditorMode.PAN,
        icon: Icons.Hand,
        hotkey: Hotkey.PAN,
        disabled: false,
        draggable: false,
    },
    {
        mode: EditorMode.INSERT_ELEMENT,
        icon: Icons.Square,
        hotkey: {
            ...Hotkey.INSERT_DIV,
            description: 'Insert Element',
            readableCommand: Hotkey.INSERT_DIV.readableCommand,
        },
        disabled: false,
        draggable: true,
        showChevron: true,
        dropdownItems: [
            {
                mode: EditorMode.INSERT_BUTTON,
                icon: Icons.Button,
                label: 'Button',
                draggable: true,
            },
            {
                mode: EditorMode.INSERT_INPUT,
                icon: Icons.Input,
                label: 'Input',
                draggable: true,
            },
        ],
    },
    {
        mode: EditorMode.INSERT_TEXT,
        icon: Icons.Text,
        hotkey: Hotkey.INSERT_TEXT,
        disabled: false,
        draggable: true,
    },
];

const Toolbar = observer(() => {
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);
    const [terminalHidden, setTerminalHidden] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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

    return (
        <AnimatePresence mode="wait">
            {editorEngine.mode !== EditorMode.INTERACT && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex flex-col border p-1 bg-background/30 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl"
                    transition={{
                        type: 'spring',
                        bounce: 0.1,
                        duration: 0.4,
                        stiffness: 200,
                        damping: 25,
                    }}
                >
                    {!terminalHidden ? (
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
                                    <RunButton setTerminalHidden={setTerminalHidden} />
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
                    ) : (
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
                                {TOOLBAR_ITEMS.map((item) => (
                                    <Tooltip key={item.mode}>
                                        <TooltipTrigger asChild>
                                            <div
                                                draggable={item.draggable}
                                                onDragStart={(e) => handleDragStart(e, item.mode)}
                                            >
                                                <div
                                                    className="relative flex items-center"
                                                    ref={item.showChevron ? dropdownRef : undefined}
                                                >
                                                    <ToggleGroupItem
                                                        value={item.mode}
                                                        aria-label={item.hotkey.description}
                                                        disabled={item.disabled}
                                                        className={cn(
                                                            'hover:text-foreground-hover text-foreground-tertiary',
                                                            item.showChevron &&
                                                                'rounded-r-none border-r-0',
                                                        )}
                                                    >
                                                        <item.icon />
                                                    </ToggleGroupItem>
                                                    {item.showChevron && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDropdownOpen(!dropdownOpen);
                                                            }}
                                                            className="h-9 w-4 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded-r-lg border-l border-border"
                                                        >
                                                            <Icons.ChevronUp
                                                                className={cn(
                                                                    'h-4 w-4 transition-transform duration-200',
                                                                    dropdownOpen
                                                                        ? 'rotate-180'
                                                                        : '',
                                                                )}
                                                            />
                                                        </button>
                                                    )}
                                                    {item.showChevron && dropdownOpen && (
                                                        <div className="absolute left-0 top-full mt-1 w-48 rounded-md shadow-lg bg-background border z-50">
                                                            <div className="py-1">
                                                                {item.dropdownItems?.map(
                                                                    (dropdownItem) => (
                                                                        <div
                                                                            key={dropdownItem.mode}
                                                                            draggable={
                                                                                dropdownItem.draggable
                                                                            }
                                                                            onDragStart={(e) =>
                                                                                handleDragStart(
                                                                                    e,
                                                                                    dropdownItem.mode,
                                                                                )
                                                                            }
                                                                            className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer text-foreground-tertiary hover:text-foreground-hover"
                                                                        >
                                                                            {React.createElement(
                                                                                dropdownItem.icon,
                                                                                {
                                                                                    className:
                                                                                        'mr-2 h-4 w-4',
                                                                                },
                                                                            )}
                                                                            <span>
                                                                                {dropdownItem.label}
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <HotKeyLabel hotkey={item.hotkey} />
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </ToggleGroup>
                            <motion.div layout>
                                <RunButton setTerminalHidden={setTerminalHidden} />
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
                    )}
                    <Terminal hidden={terminalHidden} />
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default Toolbar;
