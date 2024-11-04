import { useEditorEngine } from '@/components/Context';
import type { LayerNode } from '@onlook/models/element';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { type NodeApi, Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import RightClickMenu from '../RightClickMenu';
import TreeNode from './Tree/TreeNode';
import TreeRow from './Tree/TreeRow';
import { escapeSelector } from '/common/helpers';

const LayersTab = observer(() => {
    const treeRef = useRef<TreeApi<LayerNode>>();
    const editorEngine = useEditorEngine();
    const [treeHovered, setTreeHovered] = useState(false);
    const { ref, width, height } = useResizeObserver();

    useEffect(handleSelectChange, [editorEngine.elements.selected]);

    function handleMouseLeaveTree() {
        setTreeHovered(false);
        editorEngine.overlay.removeHoverRect();
    }

    function handleSelectChange() {
        if (editorEngine.elements.selected.length > 0) {
            treeRef.current?.scrollTo(editorEngine.elements.selected[0].selector);
        }
    }

    async function handleDragEnd({
        dragIds,
        parentId,
        index,
    }: {
        dragIds: string[];
        parentId: string | null;
        index: number;
    }) {
        if (!parentId) {
            console.log('No parent found');
            return;
        }
        if (dragIds.length !== 1) {
            console.error('Only one element can be dragged at a time');
            return;
        }

        const webview = editorEngine.webviews.getWebview(
            editorEngine.elements.selected[0].webviewId,
        );

        if (!webview) {
            console.error('No webview found');
            return;
        }

        const originalIndex: number | undefined = (await webview.executeJavaScript(
            `window.api?.getElementIndex('${escapeSelector(dragIds[0])}')`,
        )) as number | undefined;

        if (originalIndex === undefined) {
            console.error('No original index found');
            return;
        }

        const childEl = await webview.executeJavaScript(
            `window.api?.getElementWithSelector(${escapeSelector(dragIds[0])})`,
        );
        if (!childEl) {
            console.error('Failed to get element');
            return;
        }
        const parentEl = await webview.executeJavaScript(
            `window.api?.getElementWithSelector(${escapeSelector(parentId)})`,
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
            dragIds[0],
            childEl.uuid,
            parentId,
            parentEl.uuid,
            originalIndex,
            newIndex,
            webview.id,
        );
        editorEngine.action.run(moveAction);
    }

    function disableDrop({
        parentNode,
        dragNodes,
        index,
    }: {
        parentNode: NodeApi<LayerNode> | null;
        dragNodes: NodeApi<LayerNode>[];
        index: number;
    }) {
        return !dragNodes.every((node) => node?.parent?.id === parentNode?.id);
    }

    return (
        <div
            ref={ref}
            className="flex h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full"
            onMouseOver={() => setTreeHovered(true)}
            onMouseLeave={() => handleMouseLeaveTree()}
        >
            <RightClickMenu>
                <Tree
                    ref={treeRef}
                    data={editorEngine.ast.layers}
                    openByDefault={true}
                    overscanCount={1}
                    indent={8}
                    padding={0}
                    rowHeight={24}
                    height={(height ?? 8) - 16}
                    width={width ?? 365}
                    renderRow={TreeRow as any}
                    onMove={handleDragEnd}
                    disableDrop={disableDrop}
                >
                    {(props) => <TreeNode {...props} treeHovered={treeHovered} />}
                </Tree>
            </RightClickMenu>
        </div>
    );
});

export default LayersTab;
