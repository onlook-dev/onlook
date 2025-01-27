import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { motion } from 'motion/react';
import type { NodeApi } from 'react-arborist';
import type { PageNode } from '@onlook/models/pages';
import { useEditorEngine } from '@/components/Context';

const PageTreeNode = ({ node, style }: { node: NodeApi<PageNode>; style: React.CSSProperties }) => {
    const hasChildren = node.data.children && node.data.children.length > 0;
    const editorEngine = useEditorEngine();
    const webview = editorEngine.webviews.selected[0];
    const isActive = webview ? editorEngine.pages.isActivePath(webview.id, node.data.path) : false;

    const handleClick = (e: React.MouseEvent) => {
        if (hasChildren) {
            node.toggle();
        } else {
            node.select();
        }
    };

    return (
        <div
            style={style}
            className={cn('flex items-center h-6 cursor-pointer hover:bg-background-hover', {
                'bg-[#FA003C] text-white': isActive,
            })}
            onClick={handleClick}
        >
            <span className="w-4 h-4 flex-none relative">
                {hasChildren && (
                    <div className="w-4 h-4 flex items-center justify-center absolute z-50">
                        <motion.div initial={false} animate={{ rotate: node.isOpen ? 90 : 0 }}>
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
    );
};

export default PageTreeNode;
