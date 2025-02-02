import { useEditorEngine } from '@/components/Context';
import type { PageNode } from '@onlook/models/pages';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { NodeApi } from 'react-arborist';

const PageTreeNode = ({ node, style }: { node: NodeApi<PageNode>; style: React.CSSProperties }) => {
    const hasChildren = node.data.children && node.data.children.length > 0;
    const editorEngine = useEditorEngine();
    const [isActive, setIsActive] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        if (hasChildren) {
            node.toggle();
            return;
        }
        setIsActive(true);

        const webviewId = editorEngine.webviews.selected[0]?.id;
        if (webviewId) {
            editorEngine.pages.setActivePath(webviewId, node.data.path);
        }

        editorEngine.pages.setCurrentPath(node.data.path);
        node.select();

        await editorEngine.pages.navigateTo(node.data.path);
    };

    useEffect(() => {
        const updateActive = () => {
            const active = editorEngine.pages.isNodeActive(node.data);
            if (active !== isActive) {
                setIsActive(active);
            }
        };

        updateActive();
        return editorEngine.pages.subscribe(updateActive);
    }, [editorEngine.pages, node.data, isActive]);

    return (
        <div
            style={style}
            className={cn('flex items-center h-6 cursor-pointer hover:bg-background-hover', {
                'bg-red-500 text-white hover:bg-red-500': !hasChildren && isActive,
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
