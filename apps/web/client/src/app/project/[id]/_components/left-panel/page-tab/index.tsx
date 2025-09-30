import { useEditorEngine } from '@/components/store/editor';
import type { PageNode } from '@onlook/models/pages';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type NodeApi, Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { PageTreeNode } from '../layers-tab/tree/page-tree-node';
import { PageTreeRow } from '../layers-tab/tree/page-tree-row';
import { PageModal } from './page-modal';

export const PagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { ref, width, height } = useResizeObserver();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const treeRef = useRef<TreeApi<PageNode>>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        editorEngine.pages.scanPages();
    }, []);

    const filteredPages = useMemo(() => {
        if (!searchQuery.trim()) {
            return editorEngine.pages.tree;
        }

        const searchLower = searchQuery.toLowerCase();

        const getDisplayName = (node: PageNode) => {
            return node.name;
        };

        const filterNodes = (nodes: PageNode[]): PageNode[] => {
            return nodes.reduce<PageNode[]>((filtered, node) => {
                const displayName = getDisplayName(node);
                const matches = displayName.toLowerCase().includes(searchLower);
                const childMatches = node.children ? filterNodes(node.children) : [];

                if (matches || childMatches.length > 0) {
                    const newNode = { ...node };
                    if (childMatches.length > 0) {
                        newNode.children = childMatches;
                    }
                    filtered.push(newNode);
                }

                return filtered;
            }, []);
        };

        return filterNodes(editorEngine.pages.tree);
    }, [editorEngine.pages.tree, searchQuery]);

    const handleKeyDown = async (e: React.KeyboardEvent) => {
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
            if (selectedNode && !selectedNode.isInternal) {
                try {
                    await editorEngine.pages.navigateTo(selectedNode.data.path);
                    setHighlightedIndex(null);
                } catch (error) {
                    console.error('Failed to navigate to page:', error);
                }
            }
        }
    };

    const dimensions = useMemo(
        () => ({
            height: Math.max((height ?? 8) - 32, 100),
            width: width ?? 365,
        }),
        [height, width],
    );

    const pageTreeProps = useMemo(
        () => ({
            data: filteredPages,
            idAccessor: (node: PageNode) => node.id,
            childrenAccessor: (node: PageNode) =>
                node.children && node.children.length > 0 ? node.children : null,
            onSelect: async (nodes: NodeApi<PageNode>[]) => {
                if (nodes.length > 0) {
                    try {
                        await editorEngine.pages.navigateTo(nodes[0]?.data?.path ?? '');
                        setHighlightedIndex(null);
                    } catch (error) {
                        console.error('Failed to navigate to page:', error);
                    }
                }
            },
            height: dimensions.height,
            width: dimensions.width,
            indent: 8,
            rowHeight: 24,
            openByDefault: true,
            renderRow: (props: any) => (
                <PageTreeRow
                    {...props}
                    isHighlighted={
                        highlightedIndex !== null &&
                        treeRef.current?.visibleNodes[highlightedIndex]?.id === props.node.id
                    }
                />
            ),
            animationDuration: 200,
        }),
        [filteredPages, dimensions.height, dimensions.width, highlightedIndex, editorEngine.pages],
    );

    return (
        <div
            ref={ref}
            className="text-active flex h-full w-full flex-grow flex-col gap-2 overflow-hidden p-3 text-xs"
        >
            <div className="m-0 flex flex-row items-center justify-between gap-2">
                <div className="relative flex-grow">
                    <Input
                        ref={inputRef}
                        className="h-8 pr-8 text-xs"
                        placeholder="Search pages"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {searchQuery && (
                        <button
                            className="hover:bg-background-onlook group absolute top-[1px] right-[1px] bottom-[1px] flex aspect-square items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] active:bg-transparent"
                            onClick={() => setSearchQuery('')}
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
                            className="text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook h-fit w-fit border p-2"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Icons.Plus />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Create a new page</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
            </div>

            {filteredPages.length === 0 ? (
                <div
                    style={{ width: dimensions.width }}
                    className="text-foreground-primary/50 flex h-32 items-center justify-center"
                >
                    No pages found
                </div>
            ) : (
                <Tree ref={treeRef} {...pageTreeProps}>
                    {(props) => <PageTreeNode {...props} />}
                </Tree>
            )}
            <PageModal mode="create" open={showCreateModal} onOpenChange={setShowCreateModal} />
        </div>
    );
});
