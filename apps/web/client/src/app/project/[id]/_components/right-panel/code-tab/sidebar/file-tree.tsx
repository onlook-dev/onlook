import { Button } from '@onlook/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { ScrollArea } from '@onlook/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { ChevronDown, ChevronRight, Edit2, File, FileText, Folder, FolderPlus, Trash } from 'lucide-react';
import path from 'path';
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { type FileNode } from '../types';

export interface ContextMenuItem {
    label: string;
    icon: any;
    onClick: (path: string, content?: string) => void;
}

interface FileTreeProps {
    onFileSelect: (filePath: string, searchTerm?: string) => void;
    title?: string;
    emptyMessage?: string;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    onRefresh?: () => void;  // Optional refresh handler passed from parent
    contextMenuItems?: ContextMenuItem[];
    fileNodes: FileNode[];  // Required prop for file tree data
    isLoading?: boolean;  // Loading state passed from parent
    selectedFilePath?: string | null;  // Selected file passed from parent
}

const UnmemoizedFileTree = forwardRef<any, FileTreeProps>(({
    onFileSelect,
    title = 'Files',
    emptyMessage = 'No files found',
    onDeleteFile,
    onRenameFile,
    onRefresh,
    contextMenuItems = [],
    fileNodes,
    isLoading = false,
    selectedFilePath = null
}, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const treeRef = useRef<TreeApi<FileNode>>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { ref: containerRef, width: filesWidth } = useResizeObserver();
    const { ref: treeContainerRef, height: filesHeight } = useResizeObserver();

    const treeData = useMemo(() => {
        return fileNodes;
    }, [fileNodes]);

    // Expose tree API to parent component
    useImperativeHandle(ref, () => ({
        deselectAll: () => {
            if (treeRef.current) {
                treeRef.current.deselectAll();
            }
        },
        selectFile: (filePath: string) => {
            const targetNode = findNodeByPath(treeData, filePath);
            if (targetNode && treeRef.current) {
                treeRef.current.select(targetNode.path);
                treeRef.current.scrollTo(targetNode.path);
            }
        }
    }), [treeData]);

    // Helper function to find tree node by file path
    const findNodeByPath = (nodes: FileNode[], targetPath: string): FileNode | null => {
        for (const node of nodes) {
            if (node.path === targetPath && node.type === 'file') {
                return node;
            }
            if (node.children) {
                const found = findNodeByPath(node.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    };

    // Sync tree selection with selected file
    useEffect(() => {
        if (!selectedFilePath || !treeRef.current || !treeData.length) {
            return;
        }
        // Find the exact node that matches the file 
        const targetNode = findNodeByPath(treeData, selectedFilePath);
        if (targetNode) {
            setTimeout(() => {
                if (treeRef.current) {
                    treeRef.current.select(targetNode.path);
                    treeRef.current.scrollTo(targetNode.path);
                }
            }, 0);
        }
    }, [selectedFilePath, treeData]);

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return treeData;
        }

        const searchLower = searchQuery.toLowerCase();

        const filterNodes = (nodes: FileNode[]): FileNode[] => {
            return nodes.reduce<FileNode[]>((filtered, node) => {
                const nameMatches = node.name.toLowerCase().includes(searchLower);
                const pathMatches = node.path.toLowerCase().includes(searchLower);
                const childMatches = node.children ? filterNodes(node.children) : [];

                if (nameMatches || pathMatches || childMatches.length > 0) {
                    const newNode = { ...node };
                    if (childMatches.length > 0) {
                        newNode.children = childMatches;
                    }
                    filtered.push(newNode);
                }

                return filtered;
            }, []);
        };

        return filterNodes(treeData);
    }, [treeData, searchQuery]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
            setHighlightedIndex(null);
            return;
        }

        const flattenedNodes = treeRef.current?.visibleNodes ?? [];

        if (flattenedNodes.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            if (highlightedIndex === null) {
                setHighlightedIndex(e.key === 'ArrowDown' ? 0 : flattenedNodes.length - 1);
                return;
            }

            const newIndex =
                e.key === 'ArrowDown'
                    ? Math.min(highlightedIndex + 1, flattenedNodes.length - 1)
                    : Math.max(highlightedIndex - 1, 0);

            setHighlightedIndex(newIndex);

            // Ensure highlighted item is visible
            const node = flattenedNodes[newIndex];
            if (node) {
                treeRef.current?.scrollTo(node.id);
            }
        }

        if (e.key === 'Enter' && highlightedIndex !== null) {
            const selectedNode = flattenedNodes[highlightedIndex];
            if (selectedNode && !selectedNode.isInternal && selectedNode.data.type === 'file') {
                const hasSearchTerm = searchQuery.trim().length > 0;
                onFileSelect(selectedNode.data.path, hasSearchTerm ? searchQuery : undefined);
                setHighlightedIndex(null);
            }
        }
    };

    const handleFileTreeSelect = (nodes: any[]) => {
        if (nodes.length > 0 && nodes[0].data.type === 'file') {
            const hasSearchTerm = searchQuery.trim().length > 0;
            onFileSelect(nodes[0].data.path, hasSearchTerm ? searchQuery : undefined);
        }
    };

    const filesTreeDimensions = useMemo(
        () => ({
            width: filesWidth ?? 224, // Match w-56 container width (224px)
            height: filesHeight ?? 300,
        }),
        [filesWidth, filesHeight],
    );

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    }

    return (
        <div
            ref={containerRef}
            className="w-56 h-full border-r-[0.5px] flex-shrink-0 overflow-hidden flex flex-col"
        >
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
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                className="h-8 text-small pr-8 focus-visible:ring-1 focus-visible:ring-border-secondary/50 focus-visible:ring-offset-0 w-32"
                                placeholder="Search files"
                                value={searchQuery}
                                disabled={isLoading}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {searchQuery && (
                                <button
                                    className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group"
                                    onClick={() => {
                                        setSearchQuery('');
                                    }}
                                >
                                    <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                                </button>
                            )}
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={'default'}
                                    size={'icon'}
                                    className="p-2 w-fit h-8 text-foreground-tertiary hover:text-foreground-hover hover:border-border-onlook bg-background-none hover:bg-background-onlook"
                                    disabled={isLoading}
                                    onClick={handleRefresh}
                                >
                                    {isLoading ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-foreground-primary rounded-full border-t-transparent"></div>
                                    ) : (
                                        <Icons.Reload />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipPortal>
                                <TooltipContent>
                                    <p>{isLoading ? 'Loading files...' : 'Refresh files'}</p>
                                </TooltipContent>
                            </TooltipPortal>
                        </Tooltip>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div ref={treeContainerRef} className="p-2">
                        {isLoading ? (
                            <div className="flex flex-col justify-start items-center h-full text-sm text-foreground/50 pt-4">
                                <div className="animate-spin h-6 w-6 border-2 border-foreground-hover rounded-full border-t-transparent mb-2"></div>
                                <span>Loading files...</span>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <p className="px-2 py-4 text-sm text-gray-500">{fileNodes.length === 0 ? emptyMessage : 'No files match your search'}</p>
                        ) : (
                            <Tree
                                className="h-full"
                                ref={treeRef}
                                data={filteredFiles}
                                idAccessor={(node: FileNode) => node.path}
                                childrenAccessor={(node: FileNode) =>
                                    node.children && node.children.length > 0
                                        ? node.children
                                        : null
                                }
                                onSelect={handleFileTreeSelect}
                                height={filesTreeDimensions.height}
                                width={(filesWidth || 224) - 16}
                                indent={12}
                                rowHeight={24}
                                openByDefault={false}
                                renderRow={(props: any) => (
                                    <FileExplorerRow
                                        {...props}
                                        onDeleteFile={onDeleteFile}
                                        onRenameFile={onRenameFile}
                                        contextMenuItems={contextMenuItems}
                                        isHighlighted={
                                            highlightedIndex !== null &&
                                            treeRef.current?.visibleNodes[highlightedIndex]?.id ===
                                            props.node.id
                                        }
                                    />
                                )}
                            >
                                {(props) => <FileExplorerNode {...props} />}
                            </Tree>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
});

// FileExplorerRow component for react-arborist
interface FileExplorerRowProps {
    node: any;
    style: any;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    contextMenuItems?: ContextMenuItem[];
    isHighlighted: boolean;
    children: React.ReactNode;
}

function FileExplorerRow({
    node,
    style,
    onDeleteFile,
    onRenameFile,
    contextMenuItems = [],
    isHighlighted,
    children
}: FileExplorerRowProps) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.data.name);
    const isSelected = node.isSelected;
    const isDirectory = node.data.type === 'directory';

    const handleDelete = () => {
        onDeleteFile?.(node.data.path);
    };

    const handleRename = () => {
        setIsRenaming(true);
        setNewName(node.data.name);
    };

    const handleRenameSubmit = () => {
        if (newName.trim() && newName !== node.data.name) {
            onRenameFile?.(node.data.path, newName.trim());
        }
        setIsRenaming(false);
    };

    const handleRenameCancel = () => {
        setNewName(node.data.name);
        setIsRenaming(false);
    };

    return (
        <div style={style}>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={cn(
                            'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-gray-800/50',
                            (isSelected || isHighlighted) && 'bg-gray-800 text-white',
                            !(isSelected || isHighlighted) && 'text-gray-300',
                        )}
                        onClick={() => node.toggle()}
                    >
                        {node.data.children && node.data.children.length > 0 && (
                            <span className="flex-shrink-0">
                                {node.isOpen ? (
                                    <ChevronDown className="h-3 w-3" />
                                ) : (
                                    <ChevronRight className="h-3 w-3" />
                                )}
                            </span>
                        )}
                        {(!node.data.children || node.data.children.length === 0) && isDirectory && <span className="w-3" />}

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
                            <span className="truncate">{node.data.name}</span>
                        )}
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {isDirectory && (
                        <>
                            <ContextMenuItem
                                onClick={() => {
                                    const newFileName = prompt('Enter file name:');
                                    if (newFileName) {
                                        const content = prompt('Enter file content (optional):') || '';
                                        const filePath = `${node.data.path}/${newFileName}`;
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
                                        const dirPath = `${node.data.path}/${newDirName}`;
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
                        <ContextMenuItem key={index} onClick={() => item.onClick(node.data.path)} className="gap-2">
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
        </div>
    );
}

// FileExplorerNode component for react-arborist
interface FileExplorerNodeProps {
    node: any;
    style: any;
}

function FileExplorerNode({ node, style }: FileExplorerNodeProps) {
    const fileData = node.data as FileNode;

    return (
        <div style={style} className="flex items-center gap-1">
            <span className="truncate">{fileData.name}</span>
        </div>
    );
}

export const FileTree = memo(UnmemoizedFileTree);
