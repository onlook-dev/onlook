import { type FileEntry } from '@onlook/file-system/hooks';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { FileTreeNode } from './file-tree-node';
import { FileTreeRow } from './file-tree-row';
import { FileTreeSearch } from './file-tree-search';

interface FileTreeProps {
    onFileSelect: (filePath: string, searchTerm?: string) => void;
    onDeleteFile: (path: string) => void;
    onRenameFile: (oldPath: string, newName: string) => void;
    onRefresh: () => void;
    fileEntries: FileEntry[];
    isLoading: boolean;
    selectedFilePath: string | null | undefined;
}

export const FileTree = ({
    onFileSelect,
    onDeleteFile,
    onRenameFile,
    onRefresh,
    fileEntries,
    isLoading,
    selectedFilePath
}: FileTreeProps) => {
    const treeRef = useRef<TreeApi<FileEntry>>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const { ref: containerRef, width: filesWidth } = useResizeObserver();
    const { ref: treeContainerRef, height: filesHeight } = useResizeObserver();

    // Create flat entry index for efficient operations
    const flatEntryIndex = useMemo(() => {
        const flatIndex = new Map<string, FileEntry>();

        const flattenEntries = (entries: FileEntry[]) => {
            for (const entry of entries) {
                flatIndex.set(entry.path, entry);
                if (entry.children) {
                    flattenEntries(entry.children);
                }
            }
        };

        flattenEntries(fileEntries);
        return flatIndex;
    }, [fileEntries]);

    // Sync tree selection with selected file
    useEffect(() => {
        if (!treeRef.current || !fileEntries.length) {
            return;
        }

        if (!selectedFilePath) {
            // Clear selection when no file is selected
            treeRef.current.deselectAll();
            return;
        }

        // Find the exact entry that matches the file 
        // TODO: Fix path format inconsistency - try both single and double slash formats
        let entry = flatEntryIndex.get(selectedFilePath);
        if (!entry && selectedFilePath.startsWith('/')) {
            // Try with double slash if single slash didn't work
            entry = flatEntryIndex.get(`/${selectedFilePath}`);
        }
        
        const targetEntry = entry && !entry.isDirectory ? entry : null;
        if (targetEntry) {
            treeRef.current.select(targetEntry.path);
            treeRef.current.scrollTo(targetEntry.path);
        }
    }, [selectedFilePath, fileEntries, flatEntryIndex]);

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return fileEntries;
        }

        const searchLower = searchQuery.toLowerCase();
        const matchingPaths = new Set<string>();

        // Find all matching entries using flat index
        for (const [path, entry] of flatEntryIndex) {
            const nameMatches = entry.name.toLowerCase().includes(searchLower);
            const pathMatches = path.toLowerCase().includes(searchLower);

            if (nameMatches || pathMatches) {
                matchingPaths.add(path);

                // Add all parent paths to ensure they're included
                const pathSegments = path.split('/').filter(Boolean);
                for (let i = 1; i < pathSegments.length; i++) {
                    const parentPath = '/' + pathSegments.slice(0, i).join('/');
                    matchingPaths.add(parentPath);
                }
            }
        }

        // Build filtered tree structure
        const filterEntries = (entries: FileEntry[]): FileEntry[] => {
            return entries.reduce<FileEntry[]>((filtered, entry) => {
                if (matchingPaths.has(entry.path)) {
                    const newEntry = { ...entry };
                    if (entry.children) {
                        newEntry.children = filterEntries(entry.children);
                    }
                    filtered.push(newEntry);
                }
                return filtered;
            }, []);
        };

        return filterEntries(fileEntries);
    }, [fileEntries, flatEntryIndex, searchQuery]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
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
            height: (filesHeight ?? 300) - 10,
        }),
        [filesWidth, filesHeight],
    );

    return (
        <div
            ref={containerRef}
            className="w-56 h-full border-r-[0.5px] flex-shrink-0 overflow-hidden flex flex-col"
        >
            <div className="flex flex-col w-full h-full overflow-hidden">
                <FileTreeSearch
                    ref={inputRef}
                    searchQuery={searchQuery}
                    isLoading={isLoading}
                    onSearchChange={setSearchQuery}
                    onRefresh={onRefresh}
                    onKeyDown={handleKeyDown}
                />
                <div ref={treeContainerRef} className="w-full h-full overflow-auto text-xs px-2 flex-1">
                    {isLoading ? (
                        <div className="flex flex-col justify-start items-center h-full text-sm text-foreground/50 pt-4">
                            <div className="animate-spin h-6 w-6 border-2 border-foreground-hover rounded-full border-t-transparent mb-2"></div>
                            <span>Loading files...</span>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col justify-start items-center h-full text-sm text-foreground/50 pt-4">
                            {fileEntries.length === 0 ? 'No files found' : 'No files match your search'}
                        </div>
                    ) : (
                        <Tree
                            className="h-full"
                            ref={treeRef}
                            data={filteredFiles}
                            idAccessor={(entry: FileEntry) => entry.path}
                            childrenAccessor={(entry: FileEntry) =>
                                entry.children && entry.children.length > 0
                                    ? entry.children
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
                            {(props) => <FileTreeNode {...props} onFileSelect={onFileSelect} onRenameFile={onRenameFile} onDeleteFile={onDeleteFile} />}
                        </Tree>
                    )}
                </div>
            </div>
        </div>
    );
};
