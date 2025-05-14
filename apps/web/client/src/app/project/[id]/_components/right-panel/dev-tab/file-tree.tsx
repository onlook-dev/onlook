import { type FileNode } from '@onlook/models';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import { FileTreeNode } from './file-tree-node';
import { FileTreeRow } from './file-tree-row';
import { Input } from '@onlook/ui/input';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import useResizeObserver from 'use-resize-observer';
import { nanoid } from 'nanoid';
import path from 'path';
import { useEditorEngine } from '@/components/store/editor';
import type { FileEvent } from '@/components/store/editor/sandbox/file-event-bus';

interface FileTreeProps {
    onFileSelect: (filePath: string) => void;
}

export const FileTree = ({ onFileSelect }: FileTreeProps) => {
    const editorEngine = useEditorEngine();
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [treeData, setTreeData] = useState<FileNode[]>([]);
    const treeRef = useRef<TreeApi<FileNode>>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { ref: filesContainerRef, width: filesWidth } = useResizeObserver();

    // Convert flat file paths to tree structure
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
    };

    // Initial tree data load
    useEffect(() => {
        const loadInitialData = async () => {
            const files = await editorEngine.sandbox.listAllFiles();
            
            setTreeData(buildFileTree(files));
        };
        loadInitialData();
    }, [editorEngine.sandbox]);

    // Subscribe to file events
    useEffect(() => {
        const handleFileEvent = async (event: FileEvent) => {
            const files = await editorEngine.sandbox.listAllFiles();
            setTreeData(buildFileTree(files));
        };

        // Subscribe to all file events
        const unsubscribe = editorEngine.sandbox.fileEventBus.subscribe('*', handleFileEvent);

        return () => {
            unsubscribe();
        };
    }, [editorEngine.sandbox]);

    // Filter files based on search
    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return treeData;
        }

        const searchLower = searchQuery.toLowerCase();

        const filterNodes = (nodes: FileNode[]): FileNode[] => {
            return nodes.reduce<FileNode[]>((filtered, node) => {
                const nameMatches = node.name.toLowerCase().includes(searchLower);
                const childMatches = node.children ? filterNodes(node.children) : [];

                if (nameMatches || childMatches.length > 0) {
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
            if (selectedNode && !selectedNode.isInternal && !selectedNode.data.isDirectory) {
                onFileSelect(selectedNode.data.path);
                setHighlightedIndex(null);
            }
        }
    };

    const handleFileTreeSelect = (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            onFileSelect(nodes[0].data.path);
        }
    };

    const filesTreeDimensions = useMemo(
        () => ({
            width: filesWidth ?? 250,
            height: 600,
        }),
        [filesWidth],
    );

    return (
        <div
            ref={filesContainerRef}
            className="w-64 h-full border-r-[0.5px] flex-shrink-0 overflow-hidden flex flex-col"
        >
            <div className="flex flex-col h-full overflow-hidden">
                <div className="p-3 flex-shrink-0">
                    <div className="flex flex-row justify-between items-center gap-2 mb-2">
                        <div className="relative flex-grow">
                            <Input
                                ref={inputRef}
                                className="h-8 text-xs pr-8"
                                placeholder="Search files"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {searchQuery && (
                                <button
                                    className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group"
                                    onClick={() => setSearchQuery('')}
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
                                    className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                                    onClick={() => {
                                        editorEngine.sandbox.index();
                                    }}
                                >
                                    <Icons.Reload />
                                </Button>
                            </TooltipTrigger>
                            <TooltipPortal>
                                <TooltipContent>
                                    <p>Refresh files</p>
                                </TooltipContent>
                            </TooltipPortal>
                        </Tooltip>
                    </div>
                </div>

                <div
                    className="flex-1 overflow-auto px-3 text-xs"
                    style={{ height: 'calc(100% - 56px)' }}
                >
                    {filteredFiles.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-sm text-foreground/50">
                            No files found
                        </div>
                    ) : (
                        <div className="h-full">
                            <Tree
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
                                {(props) => <FileTreeNode {...props} />}
                            </Tree>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 