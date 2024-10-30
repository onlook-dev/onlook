import { useEditorEngine } from '@/components/Context';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Kbd } from '@onlook/ui/kbd';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Hotkey } from '/common/hotkeys';
import type { WebViewElement } from '@onlook/models/element';
import type { TemplateNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';

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

    useEffect(() => {
        updateMenuItems();
    }, [editorEngine.elements.selected]);

    const TOOL_ITEMS: MenuItem[] = [
        {
            label: 'Open devtool',
            action: () => {
                editorEngine.inspect();
            },
            icon: <Icons.Code className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.OPEN_DEV_TOOL,
        },
        {
            label: 'Refresh layers',
            action: () => {
                editorEngine.refreshLayers();
            },
            icon: <Icons.Reload className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.REFRESH_LAYERS,
        },
    ];

    const GROUP_ITEMS: MenuItem[] = [
        {
            label: 'Group',
            action: () => {
                editorEngine.group.groupSelectedElements();
            },
            icon: <Icons.Box className="mr-2 h-4 w-4" />,
            disabled: !editorEngine.group.canGroupElements(editorEngine.elements.selected),
            hotkey: Hotkey.GROUP,
        },
        {
            label: 'Ungroup',
            action: () => {
                editorEngine.group.ungroupSelectedElement();
            },
            icon: <Icons.Group className="mr-2 h-4 w-4" />,
            disabled: !editorEngine.group.canUngroupElement(editorEngine.elements.selected),
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
        },
        {
            label: 'Copy',
            action: () => {
                editorEngine.copy.copy();
            },
            icon: <Icons.Clipboard className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.COPY,
        },
        {
            label: 'Paste',
            action: () => {
                editorEngine.copy.paste();
            },
            icon: <Icons.ClipboardCopy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.PASTE,
        },
        {
            label: 'Cut',
            action: () => {
                editorEngine.copy.cut();
            },
            icon: <Icons.Scissors className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.CUT,
        },
        {
            label: 'Duplicate',
            action: () => {
                editorEngine.copy.duplicate();
            },
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
        },

        {
            label: 'Delete',
            action: () => {
                editorEngine.elements.delete();
            },
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DELETE,
            destructive: true,
        },
    ];

    const updateMenuItems = () => {
        let instance;
        let root;

        if (editorEngine.elements.selected.length > 0) {
            const element: WebViewElement = editorEngine.elements.selected[0];
            instance = editorEngine.ast.getInstance(element.selector);
            root = editorEngine.ast.getRoot(element.selector);
        }
        const UPDATED_TOOL_ITEMS: MenuItem[] = [
            instance && {
                label: 'View instance code',
                action: () => viewSource(instance),
                icon: <Icons.ComponentInstance className="mr-2 h-4 w-4" />,
            },
            root && {
                label: `View ${instance ? 'component' : 'element'} code`,
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

    function viewSource(templateNode?: TemplateNode) {
        editorEngine.code.viewSource(templateNode);
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                {menuItems.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {group.map((item) => (
                            <ContextMenuItem
                                key={item.label}
                                onClick={item.action}
                                disabled={item.disabled}
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
