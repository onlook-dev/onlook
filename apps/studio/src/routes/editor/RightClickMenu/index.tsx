import { useEditorEngine } from '@/components/Context';
import { EditorTabValue } from '@/lib/models';
import type { DomElement } from '@onlook/models/element';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { Kbd } from '@onlook/ui/kbd';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Hotkey } from '/common/hotkeys';
import type { FrameSettings } from '@onlook/models';
import { nanoid } from 'nanoid';

interface RightClickMenuProps {
    children: React.ReactNode;
}

interface MenuItem {
    label: string;
    action: () => void;
    hotkey?: Hotkey;
    children?: MenuItem[];
    icon: React.ReactNode;
    disabled?: boolean;
    destructive?: boolean;
}

export const RightClickMenu = observer(({ children }: RightClickMenuProps) => {
    const editorEngine = useEditorEngine();
    const [menuItems, setMenuItems] = useState<MenuItem[][]>([]);
    const [settings, setSettings] = useState<FrameSettings>();

    useEffect(() => {
        updateMenuItems();
        if (
            editorEngine.webviews.selected.length > 0 &&
            editorEngine.elements.selected.length === 0
        ) {
            setSettings(editorEngine.canvas.getFrame(editorEngine.webviews.selected[0].id));
        }
    }, [
        editorEngine.elements.selected,
        editorEngine.ast.mappings.layers,
        editorEngine.webviews.selected,
    ]);

    const TOOL_ITEMS: MenuItem[] = [
        {
            label: 'Open devtool',
            action: () => {
                editorEngine.inspect();
            },
            icon: <Icons.Code className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.OPEN_DEV_TOOL,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
        {
            label: 'Add to AI Chat',
            action: () => {
                editorEngine.editPanelTab = EditorTabValue.CHAT;
            },
            icon: <Icons.MagicWand className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ADD_AI_CHAT,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
        {
            label: 'New AI Chat',
            action: () => {
                editorEngine.editPanelTab = EditorTabValue.CHAT;
                editorEngine.chat.conversation.startNewConversation();
            },
            icon: <Icons.MagicWand className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.NEW_AI_CHAT,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
    ];

    const GROUP_ITEMS: MenuItem[] = [
        {
            label: 'Group',
            action: () => {
                editorEngine.group.groupSelectedElements();
            },
            icon: <Icons.Box className="mr-2 h-4 w-4" />,
            disabled: !editorEngine.group.canGroupElements(),
            hotkey: Hotkey.GROUP,
        },
        {
            label: 'Ungroup',
            action: () => {
                editorEngine.group.ungroupSelectedElement();
            },
            icon: <Icons.Group className="mr-2 h-4 w-4" />,
            disabled: !editorEngine.group.canUngroupElement(),
            hotkey: Hotkey.UNGROUP,
        },
    ];

    const EDITING_ITEMS: MenuItem[] = [
        {
            label: 'Edit text',
            action: () => {
                editorEngine.text.editSelectedElement();
            },
            icon: <Icons.Pencil className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ENTER,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
        {
            label: 'Copy',
            action: () => {
                editorEngine.copy.copy();
            },
            icon: <Icons.Clipboard className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.COPY,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
        {
            label: 'Paste',
            action: () => {
                editorEngine.copy.paste();
            },
            icon: <Icons.ClipboardCopy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.PASTE,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
        {
            label: 'Cut',
            action: () => {
                editorEngine.copy.cut();
            },
            icon: <Icons.Scissors className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.CUT,
            disabled:
                editorEngine.webviews.selected.length > 0 &&
                editorEngine.elements.selected.length === 0,
        },
        {
            label: 'Duplicate',
            action: () => {
                if (
                    editorEngine.webviews.selected.length > 0 &&
                    editorEngine.elements.selected.length === 0
                ) {
                    duplicateWindow();
                } else {
                    editorEngine.copy.duplicate();
                }
            },
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
        },
        {
            label: 'Delete',
            action: () => {
                if (
                    editorEngine.webviews.selected.length > 0 &&
                    editorEngine.elements.selected.length === 0
                ) {
                    deleteDuplicateWindow();
                } else {
                    editorEngine.elements.delete();
                }
            },
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DELETE,
            destructive: true,
            disabled: !settings?.duplicate,
        },
    ];

    const updateMenuItems = () => {
        let instance: string | null = null;
        let root: string | null = null;

        if (editorEngine.elements.selected.length > 0) {
            const element: DomElement = editorEngine.elements.selected[0];
            instance = element.instanceId;
            root = element.oid;
        }
        const UPDATED_TOOL_ITEMS: MenuItem[] = [
            instance && {
                label: 'View instance code',
                action: () => viewSource(instance),
                icon: <Icons.ComponentInstance className="mr-2 h-4 w-4" />,
            },
            {
                label: `View ${instance ? 'component' : 'element'} code`,
                disabled: !root,
                action: () => viewSource(root),
                icon: instance ? (
                    <Icons.Component className="mr-2 h-4 w-4" />
                ) : (
                    <Icons.ExternalLink className="mr-2 h-4 w-4" />
                ),
            },
            ...TOOL_ITEMS,
        ].filter(Boolean) as MenuItem[];

        const menuItems = [UPDATED_TOOL_ITEMS, GROUP_ITEMS, EDITING_ITEMS];

        setMenuItems(menuItems);
    };

    function viewSource(oid: string | null) {
        editorEngine.code.viewSource(oid);
    }

    function duplicateWindow(linked: boolean = false) {
        if (settings) {
            const currentFrame = settings;
            const newFrame: FrameSettings = {
                id: nanoid(),
                url: currentFrame.url,
                dimension: {
                    width: currentFrame.dimension.width,
                    height: currentFrame.dimension.height,
                },
                position: currentFrame.position,
                duplicate: true,
                linkedIds: linked ? [currentFrame.id] : [],
                aspectRatioLocked: currentFrame.aspectRatioLocked,
                orientation: currentFrame.orientation,
                device: currentFrame.device,
                theme: currentFrame.theme,
            };

            if (linked) {
                currentFrame.linkedIds = [...(currentFrame.linkedIds || []), newFrame.id];
                editorEngine.canvas.saveFrame(currentFrame.id, {
                    linkedIds: currentFrame.linkedIds,
                });
            }
            editorEngine.canvas.frames = [...editorEngine.canvas.frames, newFrame];
        }
    }

    function deleteDuplicateWindow() {
        if (settings && settings.duplicate) {
            editorEngine.canvas.frames = editorEngine.canvas.frames.filter(
                (frame) => frame.id !== settings.id,
            );

            editorEngine.canvas.frames.forEach((frame) => {
                frame.linkedIds = frame.linkedIds?.filter((id) => id !== settings.id) || null;
            });

            const webview = editorEngine.webviews.getWebview(settings.id);
            if (webview) {
                editorEngine.webviews.deregister(webview);
            }
        }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-background/95 backdrop-blur-lg">
                {menuItems.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {group.map((item) => (
                            <ContextMenuItem
                                key={item.label}
                                onClick={item.action}
                                disabled={item.disabled}
                                className="cursor-pointer"
                            >
                                <span
                                    className={cn(
                                        'flex w-full items-center gap-1',
                                        item.destructive && 'text-red',
                                    )}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                    <span className="ml-auto">
                                        {item.hotkey && <Kbd>{item.hotkey.readableCommand}</Kbd>}
                                    </span>
                                </span>
                            </ContextMenuItem>
                        ))}
                        {groupIndex < menuItems.length - 1 && <ContextMenuSeparator />}
                    </div>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
});

export default RightClickMenu;
