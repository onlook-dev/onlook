import { useEditorEngine } from '@/components/Context';
import type { LayerNode } from '@onlook/models/element';
import { observer } from 'mobx-react-lite';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { type NodeApi, Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import RightClickMenu from '../RightClickMenu';
import TreeNode from './Tree/TreeNode';
import TreeRow from './Tree/TreeRow';

const LayersTab = observer(() => {
    const treeRef = useRef<TreeApi<LayerNode>>();
    const editorEngine = useEditorEngine();
    const [treeHovered, setTreeHovered] = useState(false);
    const { ref, width, height } = useResizeObserver();

    useEffect(handleSelectChange, [
        editorEngine.elements.selected,
        editorEngine.ast.mappings.filteredLayers,
    ]);

    const handleMouseLeaveTree = useCallback(() => {
        setTreeHovered(false);
        editorEngine.overlay.state.updateHoverRect(null);
    }, [editorEngine.overlay.state]);

    function handleSelectChange() {
        if (editorEngine.elements.selected.length > 0) {
            treeRef.current?.scrollTo(editorEngine.elements.selected[0].domId);
        }
    }

    const handleDragEnd = useCallback(
        async ({
            dragNodes,
            parentNode,
            index,
        }: {
            dragNodes: NodeApi<LayerNode>[];
            parentNode: NodeApi<LayerNode> | null;
            index: number;
        }) => {
            if (!parentNode) {
                console.error('No parent found');
                return;
            }
            if (dragNodes.length !== 1) {
                console.error('Only one element can be dragged at a time');
                return;
            }
            const dragNode = dragNodes[0];
            const webview = editorEngine.webviews.getWebview(dragNode.data.webviewId);

            if (!webview) {
                console.error('No webview found');
                return;
            }

            const originalIndex: number | undefined = (await webview.executeJavaScript(
                `window.api?.getElementIndex('${dragNode.data.domId}')`,
            )) as number | undefined;

            if (originalIndex === undefined) {
                console.error('No original index found');
                return;
            }

            const childEl = await webview.executeJavaScript(
                `window.api?.getDomElementByDomId('${dragNode.data.domId}')`,
            );
            if (!childEl) {
                console.error('Failed to get element');
                return;
            }
            const parentEl = await webview.executeJavaScript(
                `window.api?.getDomElementByDomId('${parentNode.data.domId}')`,
            );
            if (!parentEl) {
                console.error('Failed to get parent element');
                return;
            }

            const newIndex = index > originalIndex ? index - 1 : index;

            if (newIndex === originalIndex) {
                console.log('No index change');
                return;
            }

            const moveAction = editorEngine.move.createMoveAction(
                webview.id,
                childEl,
                parentEl,
                newIndex,
                originalIndex,
            );
            editorEngine.action.run(moveAction);
        },
        [editorEngine],
    );

    const disableDrop = useCallback(
        ({
            parentNode,
            dragNodes,
        }: {
            parentNode: NodeApi<LayerNode> | null;
            dragNodes: NodeApi<LayerNode>[];
        }) => {
            return !dragNodes.every((node) => node?.parent?.id === parentNode?.id);
        },
        [],
    );

    const childrenAccessor = useCallback(
        (node: LayerNode) => {
            const children = node.children
                ?.map((child) => editorEngine.ast.mappings.getLayerNode(node.webviewId, child))
                .filter((child) => child !== undefined) as LayerNode[];

            return children?.length ? children : null;
        },
        [editorEngine.ast.mappings],
    );

    return (
        <div
            ref={ref}
            className="flex h-full w-full overflow-hidden text-xs text-active p-3"
            onMouseOver={() => setTreeHovered(true)}
            onMouseLeave={handleMouseLeaveTree}
        >
            <RightClickMenu>
                <Tree
                    idAccessor={(node) => node.domId}
                    childrenAccessor={childrenAccessor}
                    ref={treeRef}
                    data={editorEngine.ast.mappings.filteredLayers}
                    openByDefault={true}
                    overscanCount={0}
                    indent={8}
                    padding={0}
                    rowHeight={24}
                    height={height ?? 300}
                    width={width ?? 365}
                    renderRow={TreeRow as any}
                    onMove={handleDragEnd}
                    disableDrop={disableDrop}
                    className="overflow-auto"
                >
                    {(props) => <TreeNode {...props} treeHovered={treeHovered} />}
                </Tree>
            </RightClickMenu>
        </div>
    );
});

export default memo(LayersTab);
