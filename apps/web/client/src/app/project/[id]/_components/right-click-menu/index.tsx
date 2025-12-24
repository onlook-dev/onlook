import { Hotkey } from '@/components/hotkey';
import { IDE } from '@/components/ide';
import { useEditorEngine } from '@/components/store/editor';
import { DEFAULT_IDE, type DomElement } from '@onlook/models';
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
    const ide = IDE.fromType(DEFAULT_IDE);

    const TOOL_ITEMS: MenuItem[] = [
        {
            label: 'Add to AI Chat',
            action: () => {
                editorEngine.chat.focusChatInput();
            },
            icon: <Icons.MagicWand className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ADD_AI_CHAT,
            disabled: !editorEngine.elements.selected.length,
        },
        {
            label: 'New AI Chat',
            action: () => {
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
            action: () => editorEngine.group.groupSelectedElements(),
            disabled: !editorEngine.group.canGroupElements(),
            hotkey: Hotkey.GROUP,
        },
        {
            label: 'Ungroup',
            action: () => editorEngine.group.ungroupSelectedElement(),
            disabled: !editorEngine.group.canUngroupElement(),
            icon: <Icons.Group className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.UNGROUP,
        },
    ];

    const EDITING_ITEMS: MenuItem[] = [
        {
            label: 'Edit text',
            action: () => editorEngine.text.editSelectedElement(),
            icon: <Icons.Pencil className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ENTER,
        },
        {
            label: 'Copy',
            action: () => editorEngine.copy.copy(),
            icon: <Icons.Clipboard className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.COPY,
        },
        {
            label: 'Paste',
            action: () => editorEngine.copy.paste(),
            icon: <Icons.ClipboardCopy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.PASTE,
        },
        {
            label: 'Cut',
            action: () => editorEngine.copy.cut(),
            icon: <Icons.Scissors className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.CUT,
        },
        {
            label: 'Duplicate',
            action: () => editorEngine.copy.duplicate(),
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
        },
        {
            label: 'Delete',
            action: () => editorEngine.elements.delete(),
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DELETE,
            destructive: true,
        },
    ];

    const WINDOW_ITEMS: MenuItem[] = [
        {
            label: 'Duplicate',
            action: () => editorEngine.frames.duplicateSelected(),
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
            disabled: !editorEngine.frames.canDuplicate(),
        },
        {
            label: 'Delete',
            action: () => editorEngine.frames.deleteSelected(),
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DELETE,
            destructive: true,
            disabled: !editorEngine.frames.canDelete(),
        },
    ];

    const getMenuItems = (): MenuItem[][] => {
        if (!editorEngine.elements.selected.length) {
            return [WINDOW_ITEMS];
        }

        const element: DomElement | undefined = editorEngine.elements.selected[0];
        const instance = element?.instanceId || null;
        const root = element?.oid || null;

        const updatedToolItems = [
            instance !== null && {
                label: 'View instance code',
                action: () => instance && editorEngine.ide.openCodeBlock(instance),
                icon: <Icons.ComponentInstance className="mr-2 h-4 w-4" />,
            },
            {
                label: `View ${instance ? 'component' : 'element'} in ${ide.displayName}`,
                disabled: !root,
                action: () => root && editorEngine.ide.openCodeBlock(root),
                icon: instance ? (
                    <Icons.Component className="mr-2 h-4 w-4" />
                ) : (
                    <Icons.ExternalLink className="mr-2 h-4 w-4" />
                ),
            },
            ...TOOL_ITEMS,
        ].filter((item): item is MenuItem => item !== false);

        return [updatedToolItems, GROUP_ITEMS, EDITING_ITEMS];
    };

    const menuItems: MenuItem[][] = getMenuItems();

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
