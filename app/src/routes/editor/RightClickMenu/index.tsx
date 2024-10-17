import { useEditorEngine } from '@/components/Context';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Kbd } from '@/components/ui/kbd';
import {
    BoxIcon,
    ClipboardCopyIcon,
    ClipboardIcon,
    CodeIcon,
    Component1Icon,
    ComponentInstanceIcon,
    CopyIcon,
    ExternalLinkIcon,
    GroupIcon,
    Pencil1Icon,
    ReloadIcon,
    ScissorsIcon,
    TrashIcon,
} from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Hotkey } from '/common/hotkeys';
import { WebViewElement } from '/common/models/element';
import { TemplateNode } from '/common/models/element/templateNode';

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
            icon: <CodeIcon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.OPEN_DEV_TOOL,
        },
        {
            label: 'Refresh layers',
            action: () => {
                editorEngine.refreshLayers();
            },
            icon: <ReloadIcon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.REFRESH_LAYERS,
        },
    ];

    const GROUP_ITEMS: MenuItem[] = [
        {
            label: 'Group',
            action: () => {
                editorEngine.group.groupSelectedElements();
            },
            icon: <BoxIcon className="mr-2 h-4 w-4" />,
            disabled: !editorEngine.group.canGroupElements(editorEngine.elements.selected),
            hotkey: Hotkey.GROUP,
        },
        {
            label: 'Ungroup',
            action: () => {
                editorEngine.group.groupSelectedElements();
            },
            icon: <GroupIcon className="mr-2 h-4 w-4" />,
            disabled: !editorEngine.group.canGroupElements(editorEngine.elements.selected),
            hotkey: Hotkey.UNGROUP,
        },
    ];

    const EDITING_ITEMS: MenuItem[] = [
        {
            label: 'Edit text',
            action: () => {
                editorEngine.text.editSelectedElement();
            },
            icon: <Pencil1Icon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.ENTER,
        },
        {
            label: 'Copy',
            action: () => {
                editorEngine.copy.copy();
            },
            icon: <ClipboardIcon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.COPY,
        },
        {
            label: 'Paste',
            action: () => {
                editorEngine.copy.paste();
            },
            icon: <ClipboardCopyIcon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.PASTE,
        },
        {
            label: 'Cut',
            action: () => {
                editorEngine.copy.cut();
            },
            icon: <ScissorsIcon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.CUT,
        },
        {
            label: 'Duplicate',
            action: () => {
                editorEngine.copy.duplicate();
            },
            icon: <CopyIcon className="mr-2 h-4 w-4" />,
            hotkey: Hotkey.DUPLICATE,
        },

        {
            label: 'Delete',
            action: () => {
                editorEngine.elements.delete();
            },
            icon: <TrashIcon className="mr-2 h-4 w-4" />,
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
                icon: <ComponentInstanceIcon className="mr-2 h-4 w-4" />,
            },
            root && {
                label: `View ${instance ? 'component' : 'element'} code`,
                action: () => viewSource(root),
                icon: instance ? (
                    <Component1Icon className="mr-2 h-4 w-4" />
                ) : (
                    <ExternalLinkIcon className="mr-2 h-4 w-4" />
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
                                    className={clsx(
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
