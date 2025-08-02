import { useEditorEngine } from '@/components/store/editor';
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
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { NodeApi } from 'react-arborist';
import { FileModal } from './file-modal';
import { FolderModal } from './folder-modal';

interface FileTreeNodeProps {
    node: NodeApi<FileNode>;
    style: React.CSSProperties;
    files?: string[];
    contentMatches?: Map<string, number>;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = observer(({ node, style, files = [], contentMatches }) => {
    const editorEngine = useEditorEngine();
    const isDirectory = node.data.isDirectory;
    const [fileModalOpen, setFileModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        if (isDirectory) {
            node.toggle();
            return;
        }

        // Load the file into the editor
        try {
            const content = await editorEngine.sandbox.readFile(node.data.path);
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

    const basePath = node.data.path;

    const menuItems = [
        ...(isDirectory ? [
            {
                label: 'New File',
                action: () => setFileModalOpen(true),
                icon: <Icons.File className="mr-2 h-4 w-4" />,
                separator: false,
            },
            {
                label: 'New Folder',
                action: () => setFolderModalOpen(true),
                icon: <Icons.Directory className="mr-2 h-4 w-4" />,
                separator: true,
            },
        ] : []),
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
                editorEngine.sandbox.delete(node.data.path, true);
            },
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            separator: false,
        }
    ];

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        style={style}
                        className="flex items-center h-6 cursor-pointer hover:bg-background-hover rounded"
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
                        {!isDirectory && contentMatches?.has(node.data.path) && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium min-w-[20px] text-center">
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

            <FileModal
                open={fileModalOpen}
                onOpenChange={setFileModalOpen}
                basePath={basePath}
                files={files}
            />

            <FolderModal
                open={folderModalOpen}
                onOpenChange={setFolderModalOpen}
                basePath={basePath}
                files={files}
            />
        </>
    );
});
