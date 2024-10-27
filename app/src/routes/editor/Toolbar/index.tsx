// @ts-expect-error - No type for tokens
import { colors } from '/common/tokens';
import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Hotkey } from '/common/hotkeys';
import { Icons } from '@/components/icons';
import { InsertPos } from '/common/models';
import { ActionElement, ActionElementLocation, InsertElementAction } from '/common/models/actions';
import { EditorAttributes } from '/common/constants';

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

    useEffect(() => {
        setMode(editorEngine.mode);
    }, [editorEngine.mode]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, mode: EditorMode) => {
        e.dataTransfer.setData('text/plain', mode);
        e.dataTransfer.effectAllowed = 'copy';

        // Create a draggable
        const dragImage = document.createElement('div');
        dragImage.style.width = '100px';
        dragImage.style.height = '100px';
        dragImage.style.backgroundColor = mode === EditorMode.INSERT_DIV ? colors.blue[100] : '';
        dragImage.style.display = 'flex';
        dragImage.style.alignItems = 'center';
        dragImage.style.justifyContent = 'center';
        dragImage.style.color = mode === EditorMode.INSERT_DIV ? '' : 'black';
        dragImage.textContent = mode === EditorMode.INSERT_DIV ? '' : 'New Text';

        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 50, 50);

        //clean up on mouse release
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
    };

    const handleDragEnd = async (e: React.DragEvent<HTMLDivElement>, dragMode: EditorMode) => {
        const webview = editorEngine.webviews.webviews.values().next().value?.webview;
        if (!webview) {
            return;
        }

        // Get webview bounds and check if drop is within bounds
        const webviewRect = webview.getBoundingClientRect();
        if (
            e.clientX < webviewRect.left ||
            e.clientX > webviewRect.right ||
            e.clientY < webviewRect.top ||
            e.clientY > webviewRect.bottom
        ) {
            return;
        }

        // Calculate relative position in webview coordinates
        const x = (e.clientX - webviewRect.left) / editorEngine.canvas.scale;
        const y = (e.clientY - webviewRect.top) / editorEngine.canvas.scale;

        // Get the element at the drop location to determine insert position
        const targetEl = await webview.executeJavaScript(
            `window.api?.getElementAtLoc(${x}, ${y}, false)`,
        );
        if (!targetEl) {
            return;
        }

        // Create element details
        const uuid = nanoid();
        const isTextElement = dragMode === EditorMode.INSERT_TEXT;

        const styles: Record<string, string> = isTextElement
            ? {
                  fontSize: '20px',
                  lineHeight: '24px',
                  color: '#000000',
              }
            : {
                  width: '100px',
                  height: '100px',
                  backgroundColor: colors.blue[100],
              };

        const element: ActionElement = {
            selector: `[${EditorAttributes.DATA_ONLOOK_UNIQUE_ID}="${uuid}"]`,
            tagName: isTextElement ? 'p' : 'div',
            styles,
            children: [],
            attributes: {
                [EditorAttributes.DATA_ONLOOK_UNIQUE_ID]: uuid,
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
            },
            uuid,
            textContent: isTextElement ? 'New Text' : '',
        };

        // Create insert location
        const location: ActionElementLocation = {
            position: InsertPos.APPEND,
            targetSelector: targetEl.selector,
            index: -1,
        };

        // Create and run insert action
        const insertAction: InsertElementAction = {
            type: 'insert-element',
            targets: [
                {
                    webviewId: webview.id,
                    selector: uuid,
                    uuid,
                },
            ],
            element,
            location,
            editText: isTextElement,
        };

        editorEngine.action.run(insertAction);
    };

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
                                    <div
                                        draggable={item.draggable}
                                        onDragStart={(e) => handleDragStart(e, item.mode)}
                                        onDragEnd={(e) => handleDragEnd(e, item.mode)}
                                    >
                                        <item.icon />
                                    </div>
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
