'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, Trash, Edit2, FileText, FolderPlus, Plus } from 'lucide-react';

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
    onClick: (path: string, content?: string) => void;
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
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
                    <div className="flex gap-1">
                        {contextMenuItems.find(item => item.label === 'Create File') && (
                            <button
                                onClick={() => {
                                    const fileName = prompt('Enter file name:');
                                    if (fileName) {
                                        const content = prompt('Enter file content (optional):') || '';
                                        const filePath = fileName.startsWith('/') ? fileName : `/${fileName}`;
                                        contextMenuItems.find(item => item.label === 'Create File')?.onClick(filePath, content);
                                    }
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                title="Create file"
                            >
                                <FileText className="h-4 w-4" />
                            </button>
                        )}
                        {contextMenuItems.find(item => item.label === 'Create Directory') && (
                            <button
                                onClick={() => {
                                    const dirName = prompt('Enter directory name:');
                                    if (dirName) {
                                        const dirPath = dirName.startsWith('/') ? dirName : `/${dirName}`;
                                        contextMenuItems.find(item => item.label === 'Create Directory')?.onClick(dirPath);
                                    }
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                title="Create directory"
                            >
                                <FolderPlus className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
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
                    {isDirectory && (
                        <>
                            <ContextMenuItem 
                                onClick={() => {
                                    const newFileName = prompt('Enter file name:');
                                    if (newFileName) {
                                        const content = prompt('Enter file content (optional):') || '';
                                        const filePath = `${node.path}/${newFileName}`;
                                        contextMenuItems.find(item => item.label === 'Create File')?.onClick(filePath, content);
                                    }
                                }} 
                                className="gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                New File
                            </ContextMenuItem>
                            <ContextMenuItem 
                                onClick={() => {
                                    const newDirName = prompt('Enter directory name:');
                                    if (newDirName) {
                                        const dirPath = `${node.path}/${newDirName}`;
                                        contextMenuItems.find(item => item.label === 'Create Directory')?.onClick(dirPath);
                                    }
                                }} 
                                className="gap-2"
                            >
                                <FolderPlus className="h-4 w-4" />
                                New Folder
                            </ContextMenuItem>
                        </>
                    )}
                    {onRenameFile && (
                        <ContextMenuItem onClick={handleRename} className="gap-2">
                            <Edit2 className="h-4 w-4" />
                            Rename
                        </ContextMenuItem>
                    )}
                    {contextMenuItems.filter(item => item.label !== 'Create File' && item.label !== 'Create Directory').map((item, index) => (
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
