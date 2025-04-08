import { Hotkey } from '@/components/hotkey';
import { IDE } from '@/components/ide';
import { useEditorEngine, useUserManager } from '@/components/store';
import { DEFAULT_IDE, EditorTabValue } from '@onlook/models';
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
    const userManager = useUserManager();
    const [menuItems, setMenuItems] = useState<MenuItem[][]>([]);
    const ide = IDE.fromType(userManager.settings.settings?.editor?.ideType ?? DEFAULT_IDE);

    useEffect(() => {
        updateMenuItems();
    }, [
        // editorEngine.elements.selected,
        // editorEngine.ast.mappings.layers,
        // editorEngine.webviews.selected,
    ]);

    const OPEN_DEV_TOOL_ITEM: MenuItem = {
        label: 'Open devtool',
        action: () => editorEngine.inspect(),
        icon: <Icons.Code className="mr-2 h-4 w-4" />,
        hotkey: Hotkey.OPEN_DEV_TOOL,
    };

    const TOOL_ITEMS: MenuItem[] = [
        OPEN_DEV_TOOL_ITEM,
        {
            label: 'Add to AI Chat',
            action: () => {
                editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
                editorEngine.chat.focusChatInput();
            },
            icon: <Icons.MagicWand className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ADD_AI_CHAT,
            disabled: !editorEngine.elements.selected.length,
        },
        {
            label: 'New AI Chat',
            action: () => {
                editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
                editorEngine.chat.conversation.startNewConversation();
                editorEngine.chat.focusChatInput();
            },
            icon: <Icons.MagicWand className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.NEW_AI_CHAT,
        },
    ];

    const GROUP_ITEMS: MenuItem[] = [
        {
            label: 'Group',
            icon: <Icons.Box className="mr-2 h-4 w-4" />,
            // action: () => editorEngine.group.groupSelectedElements(),
            // disabled: !editorEngine.group.canGroupElements(),
            action: () => { },
            hotkey: Hotkey.GROUP,
        },
        {
            label: 'Ungroup',
            // action: () => editorEngine.group.ungroupSelectedElement(),
            // disabled: !editorEngine.group.canUngroupElement(),
            action: () => { },
            icon: <Icons.Group className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.UNGROUP,
        },
    ];

    const EDITING_ITEMS: MenuItem[] = [
        {
            label: 'Edit text',
            // action: () => editorEngine.text.editSelectedElement(),
            action: () => { },
            icon: <Icons.Pencil className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ENTER,
        },
        {
            label: 'Copy',
            // action: () => editorEngine.copy.copy(),
            action: () => { },
            icon: <Icons.Clipboard className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.COPY,
        },
        {
            label: 'Paste',
            // action: () => editorEngine.copy.paste(),
            action: () => { },
            icon: <Icons.ClipboardCopy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.PASTE,
        },
        {
            label: 'Cut',
            // action: () => editorEngine.copy.cut(),
            action: () => { },
            icon: <Icons.Scissors className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.CUT,
        },
        {
            label: 'Duplicate',
            // action: () => editorEngine.copy.duplicate(),
            action: () => { },
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
        },
        {
            label: 'Delete',
            // action: () => editorEngine.elements.delete(),
            action: () => { },
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DELETE,
            destructive: true,
        },
    ];

    const WINDOW_ITEMS: MenuItem[] = [
        {
            label: 'Duplicate',
            // action: () => editorEngine.duplicateWindow(),
            action: () => { },
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
        },
        {
            label: 'Delete',
            // action: () => editorEngine.deleteWindow(editorEngine.webviews.selected[0].id),
            action: () => { },
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DELETE,
            destructive: true,
            // disabled: !editorEngine.canDeleteWindow(),
        },
    ];

    const updateMenuItems = () => {
        // let instance: string | null = null;
        // let root: string | null = null;

        // if (editorEngine.elements.selected.length > 0) {
        //     const element: DomElement = editorEngine.elements.selected[0];
        //     instance = element.instanceId;
        //     root = element.oid;
        // }
        // let menuItems: MenuItem[][] = [];

        // if (editorEngine.isWindowSelected) {
        //     menuItems = [WINDOW_ITEMS, [OPEN_DEV_TOOL_ITEM]];
        // } else {
        //     const updatedToolItems = [
        //         instance !== null && {
        //             label: 'View instance code',
        //             action: () => viewSource(instance),
        //             icon: <Icons.ComponentInstance className="mr-2 h-4 w-4" />,
        //         },
        //         {
        //             label: `View ${instance ? 'component' : 'element'} in ${ide.displayName}`,
        //             disabled: !root,
        //             action: () => viewSource(root),
        //             icon: instance ? (
        //                 <Icons.Component className="mr-2 h-4 w-4" />
        //             ) : (
        //                 <Icons.ExternalLink className="mr-2 h-4 w-4" />
        //             ),
        //         },
        //         ...TOOL_ITEMS,
        //     ].filter(Boolean) as MenuItem[];

        //     menuItems = [updatedToolItems, GROUP_ITEMS, EDITING_ITEMS];
        // }

        // setMenuItems(menuItems);
    };

    function viewSource(oid: string | null) {
        editorEngine.code.viewSource(oid);
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                {/* @ts-ignore */}
                {children}
            </ContextMenuTrigger>
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