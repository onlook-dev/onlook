import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { EditorMode } from '@/lib/models';
import type { DropElementProperties } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import Terminal from './Terminal';
import RunButton from './Terminal/RunButton';
import { Hotkey } from '/common/hotkeys';

const TOOLBAR_ITEMS: {
    mode: EditorMode;
    icon: React.FC;
    hotkey: Hotkey;
    disabled: boolean;
    draggable: boolean;
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
        mode: EditorMode.INSERT_DIV,
        icon: Icons.Square,
        hotkey: Hotkey.INSERT_DIV,
        disabled: false,
        draggable: true,
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
        <div
            className={cn(
                'flex flex-col border p-1 bg-background/30 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
            )}
        >
            {!terminalHidden ? (
                // Terminal header when expanded
                <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-small text-foreground-secondary ml-2 select-none">
                        Terminal
                    </span>
                    <div className="flex items-center gap-1">
                        <RunButton />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setTerminalHidden(!terminalHidden)}
                                    className="h-9 w-9 flex items-center justify-center hover:text-foreground-hover text-foreground-tertiary hover:bg-accent rounded-md"
                                >
                                    <Icons.ChevronDown />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Toggle Terminal</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ) : (
                // Regular toolbar when terminal is hidden
                <div className="flex items-center gap-1">
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
                    <RunButton />
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
                </div>
            )}
            <Terminal hidden={terminalHidden} />
        </div>
    );
});

export default Toolbar;
