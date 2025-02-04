import { useEditorEngine } from '@/components/Context';
import type { PageNode } from '@onlook/models/pages';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { type NodeApi, Tree } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import RightClickMenu from '../RightClickMenu';
import PageTreeNode from './Tree/PageTreeNode';
import PageTreeRow from './Tree/PageTreeRow';

const PagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { ref, width, height } = useResizeObserver();

    useEffect(() => {
        editorEngine.pages.scanPages();
    }, []);

    const dimensions = useMemo(
        () => ({
            height: (height ?? 8) - 16,
            width: width ?? 365,
        }),
        [height, width],
    );

    const pageTreeProps = useMemo(
        () => ({
            data: editorEngine.pages.tree,
            idAccessor: (node: PageNode) => node.path,
            childrenAccessor: (node: PageNode) => node.children ?? null,
            onSelect: async (nodes: NodeApi<PageNode>[]) => {
                if (nodes.length > 0) {
                    try {
                        await editorEngine.pages.navigateTo(nodes[0].data.path);
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
            renderRow: PageTreeRow,
        }),
        [
            editorEngine.pages.tree,
            editorEngine.pages.navigateTo,
            dimensions.height,
            dimensions.width,
        ],
    );

    return (
        <div
            ref={ref}
            className="flex h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full"
        >
            <Tree<PageNode> {...pageTreeProps}>{(props) => <PageTreeNode {...props} />}</Tree>
        </div>
    );
});

export default PagesTab;
