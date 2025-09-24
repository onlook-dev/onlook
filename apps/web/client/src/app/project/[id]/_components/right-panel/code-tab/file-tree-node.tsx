import type { NodeApi } from 'react-arborist';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';

import type { FileNode } from '@onlook/models';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';

interface FileTreeNodeProps {
    node: NodeApi<FileNode>;
    style: React.CSSProperties;
    files?: string[];
    contentMatches?: Map<string, number>;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = observer(
    ({ node, style, files = [], contentMatches }) => {
        const editorEngine = useEditorEngine();
        const isDirectory = node.data.isDirectory;

        const handleClick = async (e: React.MouseEvent) => {
            if (isDirectory) {
                node.toggle();
                return;
            }

            // Load the file into the editor
            try {
                const content = await editorEngine.activeSandbox.readFile(node.data.path);
                if (content === null) {
                    throw new Error(`File content for ${node.data.path} not found`);
                }
                // This will be handled in the parent component
                node.select();
            } catch (error) {
                console.error('Failed to load file:', error);
            }
        };

        // Get file icon based on extension
        const getFileIcon = () => {
            const extension = node.data.extension?.toLowerCase();

            if (isDirectory) {
                return <Icons.Directory className="mr-2 h-4 w-4" />;
            }

            switch (extension) {
                case '.js':
                case '.jsx':
                case '.ts':
                case '.tsx':
                    return <Icons.Code className="mr-2 h-4 w-4" />;
                case '.css':
                case '.scss':
                case '.sass':
                    return <Icons.Box className="mr-2 h-4 w-4" />;
                case '.html':
                    return <Icons.Frame className="mr-2 h-4 w-4" />;
                case '.json':
                    return <Icons.Code className="mr-2 h-4 w-4" />;
                case '.md':
                case '.mdx':
                    return <Icons.Text className="mr-2 h-4 w-4" />;
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.gif':
                case '.svg':
                    return <Icons.Image className="mr-2 h-4 w-4" />;
                default:
                    return <Icons.File className="mr-2 h-4 w-4" />;
            }
        };

        const basePath = node.data.path;

        const menuItems = [
            ...(isDirectory
                ? [
                      {
                          label: 'New File',
                          action: () => (editorEngine.ide.fileModalOpen = true),
                          icon: <Icons.File className="mr-2 h-4 w-4" />,
                          separator: false,
                      },
                      {
                          label: 'New Folder',
                          action: () => (editorEngine.ide.folderModalOpen = true),
                          icon: <Icons.Directory className="mr-2 h-4 w-4" />,
                          separator: true,
                      },
                  ]
                : []),
            {
                label: 'Open File',
                action: handleClick,
                icon: <Icons.File className="mr-2 h-4 w-4" />,
                disabled: isDirectory,
                separator: false,
            },
            {
                label: 'Copy Path',
                action: () => {
                    navigator.clipboard.writeText(node.data.path);
                },
                icon: <Icons.Copy className="mr-2 h-4 w-4" />,
                separator: false,
            },
            {
                label: 'Delete',
                action: () => {
                    editorEngine.activeSandbox.delete(node.data.path, true);
                },
                icon: <Icons.Trash className="mr-2 h-4 w-4" />,
                separator: false,
            },
        ];

        return (
            <>
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div
                            style={style}
                            className="hover:bg-background-hover flex h-6 cursor-pointer items-center rounded"
                            onClick={handleClick}
                        >
                            <span className="relative h-4 w-4 flex-none">
                                {isDirectory && (
                                    <div className="absolute z-50 flex h-4 w-4 items-center justify-center">
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
                            {!isDirectory && contentMatches?.has(node.data.path) && (
                                <span className="bg-primary/10 text-primary ml-1 min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs font-medium">
                                    {contentMatches.get(node.data.path)}
                                </span>
                            )}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        {menuItems.map((item, index) => (
                            <div key={item.label}>
                                <ContextMenuItem
                                    onClick={item.action}
                                    className="cursor-pointer"
                                    disabled={item.disabled}
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
            </>
        );
    },
);
