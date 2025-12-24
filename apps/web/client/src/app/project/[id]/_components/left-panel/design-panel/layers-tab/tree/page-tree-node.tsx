import { useEditorEngine } from '@/components/store/editor';
import type { PageNode } from '@onlook/models/pages';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useState } from 'react';
import { PageModal } from '../../page-tab/page-modal';

interface PageTreeNodeProps {
    node: {
        data: PageNode;
        toggle: () => void;
        select: () => void;
        isOpen: boolean;
    };
    style: React.CSSProperties;
}

export const PageTreeNode: React.FC<PageTreeNodeProps> = observer(({ node, style }) => {
    const editorEngine = useEditorEngine();
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'rename'>('create');

    const hasChildren = node.data.children && node.data.children.length > 0;
    const isActive = editorEngine.pages.isNodeActive(node.data);

    const getBaseName = (fullPath: string) => {
        return fullPath.split('/').pop() ?? '';
    };

    const handleClick = async (e: React.MouseEvent) => {
        if (hasChildren) {
            node.toggle();
        }

        const webviewId = editorEngine.frames.selected[0]?.frame.id;
        if (webviewId) {
            editorEngine.pages.setActivePath(webviewId, node.data.path);
        }

        editorEngine.pages.setCurrentPath(node.data.path);
        node.select();

        await editorEngine.pages.navigateTo(node.data.path);
    };

    const handleRename = () => {
        setModalMode('rename');
        setShowModal(true);
    };

    const handleCreate = () => {
        setModalMode('create');
        setShowModal(true);
    };

    const handleDelete = async () => {
        try {
            await editorEngine.pages.deletePage(
                node.data.path,
                node.data.children && node.data.children?.length > 0 ? true : false,
            );
        } catch (error) {
            console.error('Failed to delete page:', error);
            toast.error('Failed to delete page', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const handleDuplicate = async () => {
        try {
            await editorEngine.pages.duplicatePage(node.data.path, node.data.path);

            toast('Page duplicated!');
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            toast.error('Failed to duplicate page', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const menuItems = [
        {
            label: 'Create New Page',
            action: handleCreate,
            icon: <Icons.File className="mr-2 h-4 w-4" />,
        },
        {
            label: 'Duplicate Page',
            action: handleDuplicate,
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            disabled: node.data.isRoot,
        },
        {
            label: 'Rename',
            action: handleRename,
            icon: <Icons.Pencil className="mr-2 h-4 w-4" />,
            disabled: node.data.isRoot,
        },
        {
            label: 'Delete',
            action: handleDelete,
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            destructive: true,
            disabled: node.data.isRoot,
        },
    ];

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        style={style}
                        className={cn(
                            'flex items-center h-6 cursor-pointer rounded hover:bg-background-hover',
                            isActive && 'hover:bg-red-500/90 bg-red-500 text-white',
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
                        {!node.data.isRoot &&
                            (hasChildren ? (
                                <Icons.Directory className="w-4 h-4 mr-2" />
                            ) : (
                                <Icons.File className="w-4 h-4 mr-2" />
                            ))}
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

            <PageModal
                open={showModal}
                onOpenChange={setShowModal}
                mode={modalMode}
                baseRoute={node.data.path}
                initialName={modalMode === 'rename' ? getBaseName(node.data.path) : ''}
            />
        </>
    );
});
