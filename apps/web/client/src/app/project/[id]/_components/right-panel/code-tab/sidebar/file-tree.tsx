import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { type FileNode } from '../shared/types';
import { FileTreeNode } from './file-tree-node';
import { FileTreeRow } from './file-tree-row';

interface FileTreeProps {
    onFileSelect: (filePath: string, searchTerm?: string) => void;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newName: string) => void;
    onRefresh?: () => void;
    fileNodes: FileNode[];
    isLoading?: boolean;
    selectedFilePath?: string | null;
}

export const FileTree = memo(
    forwardRef<any, FileTreeProps>(({
        onFileSelect,
        onDeleteFile,
        onRenameFile,
        onRefresh,
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
                <div className="flex flex-col w-full h-full overflow-hidden">
                    <div className="p-1.5 flex-shrink-0">
                        <div className="flex flex-row justify-between items-center gap-1 mb-2 pb-1.5 border-b-[0.5px] border-border-primary">
                            <div className="relative flex-grow">
                                <Input
                                    ref={inputRef}
                                    className="h-8 text-small pr-8 focus-visible:ring-1 focus-visible:ring-border-secondary/50 focus-visible:ring-offset-0"
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
                    <div ref={treeContainerRef} className="w-full h-full overflow-auto text-xs px-2 flex-1">
                        {isLoading ? (
                            <div className="flex flex-col justify-start items-center h-full text-sm text-foreground/50 pt-4">
                                <div className="animate-spin h-6 w-6 border-2 border-foreground-hover rounded-full border-t-transparent mb-2"></div>
                                <span>Loading files...</span>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="flex flex-col justify-start items-center h-full text-sm text-foreground/50 pt-4">
                                {fileNodes.length === 0 ? 'No files found' : 'No files match your search'}
                            </div>
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
                                indent={8}
                                rowHeight={24}
                                openByDefault={false}
                                renderRow={(props: any) => (
                                    <FileTreeRow
                                        {...props}
                                        isHighlighted={
                                            highlightedIndex !== null &&
                                            treeRef.current?.visibleNodes[highlightedIndex]?.id ===
                                            props.node.id
                                        }
                                    />
                                )}
                            >
                                {(props) => <FileTreeNode {...props} onFileSelect={onFileSelect} isSelected={props.node.isSelected} />}
                            </Tree>
                        )}
                    </div>
                </div>
            </div>
        );
    }));
