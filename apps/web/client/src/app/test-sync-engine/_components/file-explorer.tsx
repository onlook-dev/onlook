'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, Trash, Edit2 } from 'lucide-react';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { ScrollArea } from '@onlook/ui/scroll-area';
import { cn } from '@onlook/ui/utils';
import { Input } from '@onlook/ui/input';

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

export interface ContextMenuItem {
    label: string;
    icon: any;
    onClick: (path: string) => void;
}

interface FileExplorerProps {
    files: FileNode[];
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
    title: string;
    emptyMessage?: string;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    contextMenuItems?: ContextMenuItem[];
}

export function FileExplorer({
    files,
    selectedPath,
    onSelectFile,
    onDeleteFile,
    onRenameFile,
    title,
    emptyMessage = 'No files found',
    contextMenuItems = [],
}: FileExplorerProps) {
    return (
        <div className="flex h-full flex-col">
            <div className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
            </div>

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-2">
                        {files.length === 0 ? (
                            <p className="px-2 py-4 text-sm text-gray-500">{emptyMessage}</p>
                        ) : (
                            <FileTree
                                nodes={files}
                                selectedPath={selectedPath}
                                onSelectFile={onSelectFile}
                                onDeleteFile={onDeleteFile}
                                onRenameFile={onRenameFile}
                                contextMenuItems={contextMenuItems}
                            />
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

interface FileTreeProps {
    nodes: FileNode[];
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    level?: number;
    contextMenuItems?: ContextMenuItem[];
}

function FileTree({ nodes, selectedPath, onSelectFile, onDeleteFile, onRenameFile, level = 0, contextMenuItems = [] }: FileTreeProps) {
    return (
        <div className="space-y-0.5">
            {nodes.map((node) => (
                <FileTreeNode
                    key={node.path}
                    node={node}
                    selectedPath={selectedPath}
                    onSelectFile={onSelectFile}
                    onDeleteFile={onDeleteFile}
                    onRenameFile={onRenameFile}
                    level={level}
                    contextMenuItems={contextMenuItems}
                />
            ))}
        </div>
    );
}

interface FileTreeNodeProps {
    node: FileNode;
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    level: number;
    contextMenuItems?: ContextMenuItem[];
}

function FileTreeNode({
    node,
    selectedPath,
    onSelectFile,
    onDeleteFile,
    onRenameFile,
    level,
    contextMenuItems = [],
}: FileTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(level < 2);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const isSelected = selectedPath === node.path;
    const isDirectory = node.type === 'directory';
    const hasChildren = isDirectory && node.children && node.children.length > 0;

    const handleClick = () => {
        if (isDirectory) {
            setIsExpanded(!isExpanded);
        } else {
            onSelectFile(node.path);
        }
    };

    const handleDelete = () => {
        onDeleteFile?.(node.path);
    };

    const handleRename = () => {
        setIsRenaming(true);
        setNewName(node.name);
    };

    const handleRenameSubmit = () => {
        if (newName.trim() && newName !== node.name) {
            onRenameFile?.(node.path, newName.trim());
        }
        setIsRenaming(false);
    };

    const handleRenameCancel = () => {
        setNewName(node.name);
        setIsRenaming(false);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <button
                        onClick={handleClick}
                        className={cn(
                            'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-gray-800/50',
                            isSelected && 'bg-gray-800 text-white',
                            !isSelected && 'text-gray-300',
                        )}
                        style={{ paddingLeft: `${level * 12 + 8}px` }}
                    >
                        {hasChildren && (
                            <span className="flex-shrink-0">
                                {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                ) : (
                                    <ChevronRight className="h-3 w-3" />
                                )}
                            </span>
                        )}
                        {!hasChildren && isDirectory && <span className="w-3" />}

                        {isDirectory ? (
                            <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
                        ) : (
                            <File className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}

                        {isRenaming ? (
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                        handleRenameSubmit();
                                    } else if (e.key === 'Escape') {
                                        handleRenameCancel();
                                    }
                                }}
                                onBlur={handleRenameSubmit}
                                onClick={(e) => e.stopPropagation()}
                                className="h-5 px-1 py-0 text-sm"
                                autoFocus
                            />
                        ) : (
                            <span className="truncate">{node.name}</span>
                        )}
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {onRenameFile && (
                        <ContextMenuItem onClick={handleRename} className="gap-2">
                            <Edit2 className="h-4 w-4" />
                            Rename
                        </ContextMenuItem>
                    )}
                    {contextMenuItems.map((item, index) => (
                        <ContextMenuItem key={index} onClick={() => item.onClick(node.path)} className="gap-2">
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </ContextMenuItem>
                    ))}
                    {onDeleteFile && (
                        <ContextMenuItem onClick={handleDelete} variant="destructive" className="gap-2">
                            <Trash className="h-4 w-4" />
                            Delete {isDirectory ? 'Folder' : 'File'}
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>

            {isDirectory && isExpanded && node.children && (
                <FileTree
                    nodes={node.children}
                    selectedPath={selectedPath}
                    onSelectFile={onSelectFile}
                    onDeleteFile={onDeleteFile}
                    onRenameFile={onRenameFile}
                    level={level + 1}
                    contextMenuItems={contextMenuItems}
                />
            )}
        </>
    );
}
