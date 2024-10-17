import { useEditorEngine } from '@/components/Context';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Kbd } from '@/components/ui/kbd';
import {
    CodeIcon,
    Component1Icon,
    ComponentInstanceIcon,
    ExternalLinkIcon,
    ReloadIcon,
} from '@radix-ui/react-icons';
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
}

export const RightClickMenu = observer(({ children }: RightClickMenuProps) => {
    const editorEngine = useEditorEngine();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    const DEFAULT_MENU_ITEMS: MenuItem[] = [
        {
            label: 'Open devtool',
            action: () => {
                editorEngine.inspect();
            },
            icon: <CodeIcon className="mr-2 h-4 w-4" />,
        },
        {
            label: 'Refresh layers',
            action: () => {
                editorEngine.refreshLayers();
            },
            icon: <ReloadIcon className="mr-2 h-4 w-4" />,
        },
    ];

    useEffect(() => {
        updateMenuItems();
    }, [editorEngine.elements.selected]);

    const updateMenuItems = async () => {
        let instance;
        let root;

        if (editorEngine.elements.selected.length > 0) {
            const element: WebViewElement = editorEngine.elements.selected[0];
            instance = editorEngine.ast.getInstance(element.selector);
            root = editorEngine.ast.getRoot(element.selector);
        }
        const menuItems: MenuItem[] = [
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
            ...DEFAULT_MENU_ITEMS,
        ].filter(Boolean) as MenuItem[];

        setMenuItems(menuItems);
    };

    function viewSource(templateNode?: TemplateNode) {
        editorEngine.code.viewSource(templateNode);
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                {menuItems.map((item) => (
                    <ContextMenuItem key={item.label} onClick={item.action}>
                        <span className="flex w-full items-center">
                            {item.icon}
                            <span>{item.label}</span>
                            <span className="ml-auto">
                                {item.hotkey && <Kbd>{item.hotkey.readableCommand}</Kbd>}
                            </span>
                        </span>
                    </ContextMenuItem>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
});

export default RightClickMenu;
