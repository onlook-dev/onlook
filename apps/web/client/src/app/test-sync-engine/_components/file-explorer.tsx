'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, Trash } from 'lucide-react';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { ScrollArea } from '@onlook/ui/scroll-area';
import { cn } from '@onlook/ui/utils';

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

interface FileExplorerProps {
    files: FileNode[];
    selectedPath: string | null;
    onSelectFile: (path: string) => void;
    title: string;
    emptyMessage?: string;
    onDeleteFile?: (path: string) => void;
}

export function FileExplorer({
    files,
    selectedPath,
    onSelectFile,
    onDeleteFile,
    title,
    emptyMessage = 'No files found',
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
    level?: number;
}

function FileTree({ nodes, selectedPath, onSelectFile, onDeleteFile, level = 0 }: FileTreeProps) {
    return (
        <div className="space-y-0.5">
            {nodes.map((node) => (
                <FileTreeNode
                    key={node.path}
                    node={node}
                    selectedPath={selectedPath}
                    onSelectFile={onSelectFile}
                    onDeleteFile={onDeleteFile}
                    level={level}
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
    level: number;
}

function FileTreeNode({
    node,
    selectedPath,
    onSelectFile,
    onDeleteFile,
    level,
}: FileTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(level < 2);
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

                        <span className="truncate">{node.name}</span>
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleDelete} variant="destructive" className="gap-2">
                        <Trash className="h-4 w-4" />
                        Delete {isDirectory ? 'Folder' : 'File'}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {isDirectory && isExpanded && node.children && (
                <FileTree
                    nodes={node.children}
                    selectedPath={selectedPath}
                    onSelectFile={onSelectFile}
                    onDeleteFile={onDeleteFile}
                    level={level + 1}
                />
            )}
        </>
    );
}
