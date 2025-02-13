import { useEditorEngine } from '@/components/Context';
import type { PageNode } from '@onlook/models/pages';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { NodeApi } from 'react-arborist';
import { CreatePageModal } from '../PageTab/CreatePageModal';

interface PageTreeNodeProps {
    node: NodeApi<PageNode>;
    style: React.CSSProperties;
}

const PageTreeNode: React.FC<PageTreeNodeProps> = ({ node, style }) => {
    const hasChildren = node.data.children && node.data.children.length > 0;
    const editorEngine = useEditorEngine();
    const isActive = !hasChildren && editorEngine.pages.isNodeActive(node.data);
    const isRootPage = node.data.path === '/' || node.data.path === '' || node.data.path === '';
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        if (hasChildren) {
            node.toggle();
            return;
        }

        const webviewId = editorEngine.webviews.selected[0]?.id;
        if (webviewId) {
            editorEngine.pages.setActivePath(webviewId, node.data.path);
        }

        editorEngine.pages.setCurrentPath(node.data.path);
        node.select();

        await editorEngine.pages.navigateTo(node.data.path);
    };

    const handleDelete = async () => {
        try {
            await editorEngine.pages.deletePage(
                node.data.path,
                node.data.children && node.data.children?.length > 0 ? true : false,
            );
        } catch (error) {
            console.error('Failed to delete page:', error);
            toast({
                title: 'Failed to delete page',
                description: error instanceof Error ? error.message : String(error),
                variant: 'destructive',
            });
        }
    };

    const menuItems = [
        {
            label: 'Create New Page',
            action: () => {
                setShowCreateModal(true);
            },
            icon: <Icons.File className="mr-2 h-4 w-4" />,
        },
        {
            label: 'Delete',
            action: handleDelete,
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            destructive: true,
            disabled: isRootPage,
        },
    ];

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        style={style}
                        className={cn(
                            'flex items-center h-6 cursor-pointer hover:bg-background-hover rounded',
                            {
                                'bg-red-500 text-white': !hasChildren && isActive,
                            },
                        )}
                        onClick={handleClick}
                    >
                        <span className="w-4 h-4 flex-none relative">
                            {hasChildren && (
                                <div className="w-4 h-4 flex items-center justify-center absolute z-50">
                                    <motion.div
                                        initial={false}
                                        animate={{ rotate: node.isOpen ? 90 : 0 }}
                                    >
                                        <Icons.ChevronRight className="h-2.5 w-2.5" />
                                    </motion.div>
                                </div>
                            )}
                        </span>
                        {hasChildren ? (
                            <Icons.Directory className="w-4 h-4 mr-2" />
                        ) : (
                            <Icons.File className="w-4 h-4 mr-2" />
                        )}
                        <span>{node.data.name}</span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {menuItems.map((item) => (
                        <ContextMenuItem
                            key={item.label}
                            onClick={item.action}
                            className="cursor-pointer"
                            disabled={item.disabled}
                        >
                            <span
                                className={cn(
                                    'flex w-full items-center gap-1',
                                    item.destructive && 'text-red',
                                )}
                            >
                                {item.icon}

                                {item.label}
                            </span>
                        </ContextMenuItem>
                    ))}
                </ContextMenuContent>
            </ContextMenu>

            <CreatePageModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                baseRoute={node.data.path}
            />
        </>
    );
};

export default observer(PageTreeNode);
