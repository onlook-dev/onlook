import { useEditorEngine } from '@/components/Context';
import type { PageNode } from '@onlook/models/pages';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type NodeApi, Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import PageTreeNode from '../Tree/PageTreeNode';
import PageTreeRow from '../Tree/PageTreeRow';
import { CreatePageModal } from './CreatePageModal';

const PagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { ref, width, height } = useResizeObserver();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const treeRef = useRef<TreeApi<PageNode>>();
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
            height: Math.max((height ?? 8) - 16, 100),
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
                        await editorEngine.pages.navigateTo(nodes[0].data.path);
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
        [
            filteredPages,
            editorEngine.pages.navigateTo,
            dimensions.height,
            dimensions.width,
            highlightedIndex,
        ],
    );

    return (
        <div
            ref={ref}
            className="flex flex-col gap-2 h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0.5"
        >
            <div className="flex flex-row justify-between items-center gap-2 m-0">
                <div className="relative flex-grow">
                    <Input
                        ref={inputRef}
                        className="h-8 text-xs pr-8"
                        placeholder="Search pages"
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
                    <TooltipTrigger>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
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
                    className="flex items-center justify-center h-32 text-foreground-primary/50"
                >
                    No pages found
                </div>
            ) : (
                <Tree ref={treeRef} {...pageTreeProps}>
                    {(props) => <PageTreeNode {...props} />}
                </Tree>
            )}
            <CreatePageModal open={showCreateModal} onOpenChange={setShowCreateModal} />
        </div>
    );
});

export default PagesTab;
