import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Kbd } from '@/components/ui/kbd';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '..';
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
}
export const RightClickMenu = observer(({ children }: RightClickMenuProps) => {
    const editorEngine = useEditorEngine();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    const DEFAULT_MENU_ITEMS: MenuItem[] = [];

    useEffect(() => {
        updateMenuItems();
    }, [editorEngine.elements.selected]);

    const updateMenuItems = async () => {
        let instance;
        let root;

        if (editorEngine.elements.selected.length > 0) {
            const element: WebViewElement = editorEngine.elements.selected[0];
            instance = await editorEngine.ast.getInstance(element.selector);
            root = await editorEngine.ast.getRoot(element.selector);
        }
        const menuItems: MenuItem[] = [
            ...DEFAULT_MENU_ITEMS,
            instance && {
                label: 'View instance code',
                action: () => viewSource(instance),
            },
            root && {
                label: 'View component code',
                action: () => viewSource(root),
            },
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
                        <span className="flex w-full">
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
