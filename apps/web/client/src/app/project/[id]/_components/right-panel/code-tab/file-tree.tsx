import path from 'path';
import type { TreeApi } from 'react-arborist';
import {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { observer } from 'mobx-react-lite';
import { Tree } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';

import type { FileNode } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';

import { useEditorEngine } from '@/components/store/editor';
import { FileTreeNode } from './file-tree-node';
import { FileTreeRow } from './file-tree-row';

interface FileTreeProps {
    onFileSelect: (filePath: string, searchTerm?: string) => void;
}

const UnmemoizedFileTree = observer(
    forwardRef<any, FileTreeProps>(({ onFileSelect }, ref) => {
        const editorEngine = useEditorEngine();
        const ide = editorEngine.ide;
        const files = editorEngine.activeSandbox.files;
        const isLoading = ide.isFilesLoading;
        const activeFilePath = ide.activeFile?.path || null;

        const [searchQuery, setSearchQuery] = useState('');
        const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
        const [contentMatches, setContentMatches] = useState<Map<string, number>>(new Map());
        const [isSearching, setIsSearching] = useState(false);
        const treeRef = useRef<TreeApi<FileNode>>(null);
        const inputRef = useRef<HTMLInputElement>(null);
        const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const { ref: containerRef, width: filesWidth } = useResizeObserver();
        const { ref: treeContainerRef, height: filesHeight } = useResizeObserver();

        const isTextFile = useCallback((filePath: string): boolean => {
            const ext = path.extname(filePath).toLowerCase();
            return [
                '.js',
                '.jsx',
                '.ts',
                '.tsx',
                '.html',
                '.css',
                '.scss',
                '.sass',
                '.md',
                '.mdx',
                '.txt',
                '.json',
                '.xml',
                '.yaml',
                '.yml',
            ].includes(ext);
        }, []);

        const searchFileContent = useCallback(
            async (filePath: string, query: string): Promise<number> => {
                if (!isTextFile(filePath)) return 0;

                try {
                    const file = await editorEngine.activeSandbox.readFile(filePath);
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
            },
            [editorEngine.activeSandbox, isTextFile],
        );

        const performContentSearch = useCallback(
            async (query: string) => {
                if (!query.trim() || query.length < 2) {
                    setContentMatches(new Map());
                    setIsSearching(false);
                    return;
                }

                setIsSearching(true);
                const matches = new Map<string, number>();

                const searchPromises = files.filter(isTextFile).map(async (filePath) => {
                    const count = await searchFileContent(filePath, query);
                    if (count > 0) {
                        matches.set(filePath, count);
                    }
                });

                await Promise.all(searchPromises);
                setContentMatches(matches);
                setIsSearching(false);
            },
            [files, isTextFile, searchFileContent],
        );

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

        const treeData = useMemo(() => {
            const buildFileTree = (files: string[]): FileNode[] => {
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
                                id: filePath || `dir:${filePath}`, // Use path as stable ID
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
            };
            return buildFileTree(files);
        }, [files]);

        // Expose tree API to parent component
        useImperativeHandle(
            ref,
            () => ({
                deselectAll: () => {
                    if (treeRef.current) {
                        treeRef.current.deselectAll();
                    }
                },
                selectFile: (filePath: string) => {
                    const targetNode = findNodeByPath(treeData, filePath);
                    if (targetNode && treeRef.current) {
                        treeRef.current.select(targetNode.id);
                        treeRef.current.scrollTo(targetNode.id);
                    }
                },
            }),
            [treeData],
        );

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
                width: filesWidth ?? 224, // Match w-56 container width (224px)
                height: filesHeight ?? 300,
            }),
            [filesWidth, filesHeight, editorEngine.state.rightPanelTab],
        );

        const handleRefresh = async () => {
            setContentMatches(new Map());
            ide.clearSearch();
            await ide.refreshFiles();
        };

        return (
            <div
                ref={containerRef}
                className="flex h-full w-56 flex-shrink-0 flex-col overflow-hidden border-r-[0.5px]"
            >
                <div className="flex h-full w-full flex-col overflow-hidden">
                    <div className="flex-shrink-0 p-1.5">
                        <div className="border-border-primary mb-2 flex flex-row items-center justify-between gap-1 border-b-[0.5px] pb-1.5">
                            <div className="relative flex-grow">
                                <Input
                                    ref={inputRef}
                                    className="text-small focus-visible:ring-border-secondary/50 h-8 pr-8 focus-visible:ring-1 focus-visible:ring-offset-0"
                                    placeholder="Search files"
                                    value={searchQuery}
                                    disabled={isLoading}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                {searchQuery && (
                                    <button
                                        className="hover:bg-background-onlook group absolute top-[1px] right-[1px] bottom-[1px] flex aspect-square items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] active:bg-transparent"
                                        onClick={() => {
                                            setSearchQuery('');
                                            editorEngine.ide.clearSearch();
                                        }}
                                    >
                                        <Icons.CrossS className="text-foreground-primary/50 group-hover:text-foreground-primary h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={'default'}
                                        size={'icon'}
                                        className="text-foreground-tertiary hover:text-foreground-hover hover:border-border-onlook bg-background-none hover:bg-background-onlook h-8 w-fit p-2"
                                        disabled={isLoading}
                                        onClick={handleRefresh}
                                    >
                                        {isLoading ? (
                                            <div className="border-foreground-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
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
                    <div
                        ref={treeContainerRef}
                        className="h-full w-full flex-1 overflow-auto px-2 text-xs"
                    >
                        {isLoading ? (
                            <div className="text-foreground/50 flex h-full flex-col items-center justify-start pt-4 text-sm">
                                <div className="border-foreground-hover mb-2 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
                                <span>Loading files...</span>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="text-foreground/50 flex h-full flex-col items-center justify-start pt-4 text-sm">
                                {files.length === 0
                                    ? 'No files found'
                                    : 'No files match your search'}
                            </div>
                        ) : (
                            <Tree
                                className="h-full"
                                ref={treeRef}
                                data={filteredFiles}
                                idAccessor={(node: FileNode) => node.id}
                                childrenAccessor={(node: FileNode) =>
                                    node.children && node.children.length > 0 ? node.children : null
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
                                {(props) => (
                                    <FileTreeNode
                                        {...props}
                                        files={files}
                                        contentMatches={contentMatches}
                                    />
                                )}
                            </Tree>
                        )}
                    </div>
                </div>
            </div>
        );
    }),
);

export const FileTree = memo(UnmemoizedFileTree);
