'use client';

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
import { useEffect, useRef, useState } from 'react';
import type { NodeApi } from 'react-arborist';

interface FileTreeNodeProps {
    node: NodeApi<FileEntry>;
    style: React.CSSProperties;
    onFileSelect: (filePath: string, searchTerm?: string) => void;
    onRenameFile: (oldPath: string, newPath: string) => void;
    onDeleteFile: (path: string) => void;
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

export const FileTreeNode = ({
    node, style, onFileSelect, onRenameFile, onDeleteFile
}: FileTreeNodeProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState(node.data.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const isDirectory = node.data.isDirectory;

    const handleClick = (e: React.MouseEvent) => {
        if (isEditing) return;

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

    const handleRename = () => {
        if (node.data.isDirectory) return;
        if (isEditing) return;

        setIsEditing(true);
        setEditingName(node.data.name);
    };

    useEffect(() => {
        const input = inputRef.current;
        if (!input) {
            return;
        }

        if (!isEditing) {
            return;
        }

        // Don't focus if already focused
        if (document.activeElement === input) {
            return;
        }

        input.focus();
        const filename = node.data.name;
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0 && !isDirectory) {
            // Select from start to before the last dot (extension)
            input?.setSelectionRange(0, lastDotIndex);
        } else {
            // If no extension or is directory, select all
            input?.select();
        }
    }, [inputRef.current]);

    const handleBlur = () => {
        if (editingName.trim() && editingName !== node.data.name) {
            const newPath = node.data.path.replace(node.data.name, editingName.trim());
            onRenameFile(node.data.path, newPath);
        }
        setIsEditing(false);
        setEditingName(node.data.name);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditingName(node.data.name);
        }
    };

    const menuItems: Array<{
        label: string;
        action: () => void;
        icon: React.ReactElement;
        separator: boolean;
        className?: string;
    }> = [
            {
                label: 'Rename',
                action: handleRename,
                icon: <Icons.Edit className="w-4 h-4" />,
                separator: false,
            },
            {
                label: 'Delete',
                action: () => {
                    onDeleteFile(node.data.path);
                },
                icon: <Icons.Trash className="w-4 h-4 text-red-500" />,
                separator: false,
                className: 'text-red-500',
            }
        ];

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    style={style}
                    className="flex items-center h-6 cursor-pointer rounded"
                    onClick={handleClick}
                    onDoubleClick={(e) => handleRename()}
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
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="truncate bg-transparent rounded-[1px] outline-2 outline-rounded outline-border-primary outline-offset-2 px-0"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate">{node.data.name}</span>
                    )}
                    {/* {!isDirectory && contentMatches?.has(node.data.path) && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium min-w-[20px] text-center">
                            {contentMatches.get(node.data.path)}
                        </span>
                    )} */}
                </div>
            </ContextMenuTrigger>
            {isDirectory && <ContextMenuContent>
                {menuItems.map((item, index) => (
                    <div key={item.label}>
                        <ContextMenuItem
                            onClick={item.action}
                            className="cursor-pointer"
                        >
                            <span className={cn('flex w-full items-center gap-1', item.className)}>
                                {item.icon}
                                {item.label}
                            </span>
                        </ContextMenuItem>
                        {item.separator && <ContextMenuSeparator />}
                    </div>
                ))}
            </ContextMenuContent>}
        </ContextMenu >
    );
};
