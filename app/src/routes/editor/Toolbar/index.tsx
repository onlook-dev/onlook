import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Hotkey } from '/common/hotkeys';
import { Icons } from '@/components/icons';

const TOOLBAR_ITEMS: {
    mode: EditorMode;
    icon: React.FC;
    hotkey: Hotkey;
    disabled: boolean;
}[] = [
    {
        mode: EditorMode.DESIGN,
        icon: Icons.CursorArrow,
        hotkey: Hotkey.SELECT,
        disabled: false,
    },
    {
        mode: EditorMode.PAN,
        icon: Icons.Hand,
        hotkey: Hotkey.PAN,
        disabled: false,
    },
    {
        mode: EditorMode.INSERT_DIV,
        icon: Icons.Square,
        hotkey: Hotkey.INSERT_DIV,
        disabled: false,
    },
    {
        mode: EditorMode.INSERT_TEXT,
        icon: Icons.Text,
        hotkey: Hotkey.INSERT_TEXT,
        disabled: false,
    },
];

const Toolbar = observer(() => {
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);

    useEffect(() => {
        setMode(editorEngine.mode);
    }, [editorEngine.mode]);

    return (
        <div
            className={clsx(
                'border p-1 flex bg-background/30 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl items-center justify-center',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
            )}
        >
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
                            <div>
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
        </div>
    );
});

export default Toolbar;
