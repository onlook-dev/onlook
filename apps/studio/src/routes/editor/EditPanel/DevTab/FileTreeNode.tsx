import { useEditorEngine } from '@/components/Context';
import type { FileNode } from '@/lib/editor/engine/files';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import type { NodeApi } from 'react-arborist';

interface FileTreeNodeProps {
    node: NodeApi<FileNode>;
    style: React.CSSProperties;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, style }) => {
    const editorEngine = useEditorEngine();
    const isDirectory = node.data.isDirectory;

    const handleClick = async (e: React.MouseEvent) => {
        if (isDirectory) {
            node.toggle();
            return;
        }

        // Load the file into the editor
        try {
            await editorEngine.code.getFileContent(node.data.path, false).then((content) => {
                if (content !== null) {
                    // This will be handled in the parent component
                    node.select();
                }
            });
        } catch (error) {
            console.error('Failed to load file:', error);
        }
    };

    // Get file icon based on extension
    const getFileIcon = () => {
        const extension = node.data.extension?.toLowerCase();

        if (isDirectory) {
            return <Icons.Directory className="w-4 h-4 mr-2" />;
        }

        switch (extension) {
            case '.js':
            case '.jsx':
            case '.ts':
            case '.tsx':
                return <Icons.Code className="w-4 h-4 mr-2" />;
            case '.css':
            case '.scss':
            case '.sass':
                return <Icons.Box className="w-4 h-4 mr-2" />;
            case '.html':
                return <Icons.Frame className="w-4 h-4 mr-2" />;
            case '.json':
                return <Icons.Code className="w-4 h-4 mr-2" />;
            case '.md':
            case '.mdx':
                return <Icons.Text className="w-4 h-4 mr-2" />;
            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.svg':
                return <Icons.Image className="w-4 h-4 mr-2" />;
            default:
                return <Icons.File className="w-4 h-4 mr-2" />;
        }
    };

    const menuItems = [
        {
            label: 'Open File',
            action: handleClick,
            icon: <Icons.File className="mr-2 h-4 w-4" />,
            disabled: isDirectory,
        },
        {
            label: 'Copy Path',
            action: () => {
                navigator.clipboard.writeText(node.data.path);
            },
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
        },
    ];

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    style={style}
                    className={cn(
                        'flex items-center h-6 cursor-pointer hover:bg-background-hover rounded',
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
                    {getFileIcon()}
                    <span className="truncate">{node.data.name}</span>
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
                        <span className={cn('flex w-full items-center gap-1')}>
                            {item.icon}
                            {item.label}
                        </span>
                    </ContextMenuItem>
                ))}
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default observer(FileTreeNode);
