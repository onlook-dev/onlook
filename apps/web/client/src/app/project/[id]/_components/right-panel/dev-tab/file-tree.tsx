import { useEditorEngine } from '@/components/store/editor';
import { type FileNode } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { nanoid } from 'nanoid';
import path from 'path';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { FileTreeNode } from './file-tree-node';
import { FileTreeRow } from './file-tree-row';

interface FileTreeProps {
    onFileSelect: (filePath: string, searchTerm?: string) => void;
    files: string[];
    isLoading?: boolean;
    onRefresh?: () => Promise<void>;
    activeFilePath?: string | null;
}

function UnmemoizedFileTree({ onFileSelect, files, isLoading = false, onRefresh, activeFilePath }: FileTreeProps) {
    const editorEngine = useEditorEngine();
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [treeData, setTreeData] = useState<FileNode[]>([]);
    const [contentMatches, setContentMatches] = useState<Map<string, number>>(new Map());
    const [isSearching, setIsSearching] = useState(false);
    const treeRef = useRef<TreeApi<FileNode>>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { ref: containerRef, width: filesWidth } = useResizeObserver();
    const { ref: treeContainerRef, height: filesHeight } = useResizeObserver();

    const isTextFile = useCallback((filePath: string): boolean => {
        const ext = path.extname(filePath).toLowerCase();
        return ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass', '.md', '.mdx', '.txt', '.json', '.xml', '.yaml', '.yml'].includes(ext);
    }, []);

    const searchFileContent = useCallback(async (filePath: string, query: string): Promise<number> => {
        if (!isTextFile(filePath)) return 0;
        
        try {
            const file = await editorEngine.sandbox.readFile(filePath);
            if (!file || file.type !== 'text' || typeof file.content !== 'string') return 0;
            
            const content = file.content.toLowerCase();
            const searchTerm = query.toLowerCase();
            let count = 0;
            let index = 0;
            
            while ((index = content.indexOf(searchTerm, index)) !== -1) {
                count++;
                index += searchTerm.length;
            }
            
            return count;
        } catch {
            return 0;
        }
    }, [editorEngine.sandbox, isTextFile]);

    const performContentSearch = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setContentMatches(new Map());
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const matches = new Map<string, number>();
        
        const searchPromises = files
            .filter(isTextFile)
            .map(async (filePath) => {
                const count = await searchFileContent(filePath, query);
                if (count > 0) {
                    matches.set(filePath, count);
                }
            });

        await Promise.all(searchPromises);
        setContentMatches(matches);
        setIsSearching(false);
    }, [files, isTextFile, searchFileContent]);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            performContentSearch(searchQuery);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, performContentSearch]);

    const buildFileTree = useMemo(() => (files: string[]): FileNode[] => {
        const root: FileNode = {
            id: 'root',
            name: 'root',
            path: '',
            isDirectory: true,
            children: [],
        };

        files.forEach((filePath) => {
            const parts = filePath.split('/').filter(Boolean);
            let current = root;

            parts.forEach((part, index) => {
                const isLast = index === parts.length - 1;
                const filePath = parts.slice(0, index + 1).join('/');
                const existingNode = current.children?.find((child) => child.name === part);

                if (existingNode) {
                    current = existingNode;
                } else {
                    const newNode: FileNode = {
                        id: nanoid(),
                        name: part,
                        path: filePath,
                        isDirectory: !isLast,
                        children: !isLast ? [] : undefined,
                        extension: isLast ? path.extname(filePath) : undefined,
                    };
                    current.children?.push(newNode);
                    current = newNode;
                }
            });
        });

        return root.children || [];
    }, []);

    // Update tree data only when files change
    useEffect(() => {
        setTreeData(buildFileTree(files));
    }, [files, buildFileTree]);

    // Helper function to find tree node by file path
    const findNodeByPath = (nodes: FileNode[], targetPath: string): FileNode | null => {
        for (const node of nodes) {
            if (node.path === targetPath && !node.isDirectory) {
                return node;
            }
            if (node.children) {
                const found = findNodeByPath(node.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    };

    // Sync tree selection with active file
    useEffect(() => {
        if (!activeFilePath || !treeRef.current || !treeData.length) {
            return;
        }
        // Find the exact node that matches the file 
        const targetNode = findNodeByPath(treeData, activeFilePath);
        if (targetNode) {
            setTimeout(() => {
                if (treeRef.current) {
                    treeRef.current.select(targetNode.id);
                    treeRef.current.scrollTo(targetNode.id);
                }
            }, 0);
        }
    }, [activeFilePath, treeData]);

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return treeData;
        }

        const searchLower = searchQuery.toLowerCase();

        const filterNodes = (nodes: FileNode[]): FileNode[] => {
            return nodes.reduce<FileNode[]>((filtered, node) => {
                const nameMatches = node.name.toLowerCase().includes(searchLower);
                const hasContentMatches = !node.isDirectory && contentMatches.has(node.path);
                const childMatches = node.children ? filterNodes(node.children) : [];

                if (nameMatches || hasContentMatches || childMatches.length > 0) {
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
    }, [treeData, searchQuery, contentMatches]);

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
            if (selectedNode && !selectedNode.isInternal && !selectedNode.data.isDirectory) {
                const hasSearchTerm = searchQuery.trim().length > 0;
                onFileSelect(selectedNode.data.path, hasSearchTerm ? searchQuery : undefined);
                setHighlightedIndex(null);
            }
        }
    };

    const handleFileTreeSelect = (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            const hasSearchTerm = searchQuery.trim().length > 0;
            onFileSelect(nodes[0].data.path, hasSearchTerm ? searchQuery : undefined);
        }
    };

    const filesTreeDimensions = useMemo(
        () => ({
            width: filesWidth ?? 250,
            height: filesHeight ?? 300,
        }),
        [filesWidth, filesHeight, editorEngine.state.rightPanelTab],
    );

    const handleRefresh = async () => {
        setContentMatches(new Map());
        editorEngine.ide.clearSearch();
        if (onRefresh) {
            await onRefresh();
        } else {
            try {
                await editorEngine.sandbox.index(true);
                await editorEngine.sandbox.listAllFiles();
            } catch (error) {
                console.error('Error refreshing files:', error);
            }
        }
    }

    return (
        <div
            ref={containerRef}
            className="w-56 h-full border-r-[0.5px] flex-shrink-0 overflow-hidden flex flex-col"
        >
            <div className="flex flex-col h-full overflow-hidden">
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
                                        editorEngine.ide.clearSearch();
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
                <div ref={treeContainerRef} className="min-w-full h-full overflow-x-auto text-xs w-full h-full px-2 flex-1">
                    {isLoading ? (
                        <div className="flex flex-col justify-start items-center h-full text-sm text-foreground/50 pt-4">
                            <div className="animate-spin h-6 w-6 border-2 border-foreground-hover rounded-full border-t-transparent mb-2"></div>
                            <span>Loading files...</span>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex justify-start items-start h-full text-sm text-foreground/50 pt-4 pl-2">
                            {files.length === 0 ? 'No files found' : 'No files match your search'}
                        </div>
                    ) : (
                        <Tree
                            className="h-full"
                            ref={treeRef}
                            data={filteredFiles}
                            idAccessor={(node: FileNode) => node.id}
                            childrenAccessor={(node: FileNode) =>
                                node.children && node.children.length > 0
                                    ? node.children
                                    : null
                            }
                            onSelect={handleFileTreeSelect}
                            height={filesTreeDimensions.height}
                            width={filesTreeDimensions.width}
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
                            {(props) => <FileTreeNode {...props} files={files} contentMatches={contentMatches} />}
                        </Tree>
                    )}
                </div>
            </div>
        </div>
    );
}

export const FileTree = memo(UnmemoizedFileTree);