import { useEditorEngine } from '@/components/Context';
import type { PageNode } from '@onlook/models/pages';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { type NodeApi, Tree } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import PageTreeNode from '../Tree/PageTreeNode';
import PageTreeRow from '../Tree/PageTreeRow';
import { CreatePageModal } from './CreatePageModal';

const PagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { ref, width, height } = useResizeObserver();
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        editorEngine.pages.scanPages();
    }, []);

    const dimensions = useMemo(
        () => ({
            height: Math.max((height ?? 8) - 16, 100),
            width: width ?? 365,
        }),
        [height, width],
    );

    const pageTreeProps = useMemo(
        () => ({
            data: editorEngine.pages.tree,
            idAccessor: (node: PageNode) => node.id,
            childrenAccessor: (node: PageNode) =>
                node.children && node.children.length > 0 ? node.children : null,
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
            animationDuration: 200,
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
            className="flex flex-col gap-2 h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full"
        >
            <div className="flex flex-row justify-between items-center gap-2 m-2">
                <Input className="h-8 text-xs" placeholder="Search pages" />
                <Tooltip>
                    <TooltipTrigger>
                        <Button
                            variant={'ghost'}
                            size={'icon'}
                            className="p-2 w-fit h-fit hover:bg-background-onlook"
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

            <Tree {...pageTreeProps}>{(props) => <PageTreeNode {...props} />}</Tree>
            <CreatePageModal open={showCreateModal} onOpenChange={setShowCreateModal} />
        </div>
    );
});

export default PagesTab;
