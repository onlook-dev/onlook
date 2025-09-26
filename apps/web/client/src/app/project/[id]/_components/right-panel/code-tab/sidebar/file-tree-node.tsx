import type { FileEntry } from '@onlook/file-system/hooks';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { motion } from 'motion/react';
import type { NodeApi } from 'react-arborist';

interface FileTreeNodeProps {
    node: NodeApi<FileEntry>;
    style: React.CSSProperties;
    onFileSelect?: (filePath: string, searchTerm?: string) => void;
}

const getFileIcon = (path: string, isDirectory: boolean) => {
    const extension = path.split('.').pop()?.toLowerCase();

    if (isDirectory) {
        return <Icons.Directory className="w-4 h-4 mr-2" />;
    }

    switch (extension) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return <Icons.Code className="w-4 h-4 mr-2" />;
        case 'css':
        case 'scss':
        case 'sass':
            return <Icons.Box className="w-4 h-4 mr-2" />;
        case 'html':
            return <Icons.Frame className="w-4 h-4 mr-2" />;
        case 'json':
            return <Icons.Code className="w-4 h-4 mr-2" />;
        case 'md':
        case 'mdx':
            return <Icons.Text className="w-4 h-4 mr-2" />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
            return <Icons.Image className="w-4 h-4 mr-2" />;
        default:
            return <Icons.File className="w-4 h-4 mr-2" />;
    }
};

export const FileTreeNode = ({ node, style, onFileSelect }: FileTreeNodeProps) => {
    const isDirectory = node.data.isDirectory;
    const isSelected = node.isSelected;
    const handleClick = (e: React.MouseEvent) => {
        if (isDirectory) {
            node.toggle();
            return;
        }
        if (onFileSelect) {
            onFileSelect(node.data.path);
        }
        // Select the node in the tree
        node.select();
    };

    const menuItems: Array<{
        label: string;
        action: () => void;
        icon: React.ReactElement;
        separator: boolean;
    }> = [];

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    style={style}
                    className={cn(
                        "flex items-center h-6 cursor-pointer rounded",
                        isSelected ? 'hover:bg-red-500/90 dark:hover:bg-red-500/90' : ' hover:bg-background-hover ',
                    )}
                    onClick={handleClick}
                >
                    <span className="w-4 h-4 flex-none relative">
                        {isDirectory && (
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
                    {getFileIcon(node.data.path, isDirectory)}
                    <span className="truncate">{node.data.name}</span>
                    {/* {!isDirectory && contentMatches?.has(node.data.path) && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium min-w-[20px] text-center">
                            {contentMatches.get(node.data.path)}
                        </span>
                    )} */}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                {menuItems.map((item, index) => (
                    <div key={item.label}>
                        <ContextMenuItem
                            onClick={item.action}
                            className="cursor-pointer"
                        >
                            <span className={cn('flex w-full items-center gap-1')}>
                                {item.icon}
                                {item.label}
                            </span>
                        </ContextMenuItem>
                        {item.separator && <ContextMenuSeparator />}
                    </div>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
};
