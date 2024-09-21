import { useEditorEngine } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import RightClickMenu from '../RightClickMenu';
import TreeNode from './Tree/TreeNode';
import TreeRow from './Tree/TreeRow';
import { LayerNode } from '/common/models/element/layers';

const LayersTab = observer(() => {
    const treeRef = useRef<TreeApi<LayerNode>>();
    const editorEngine = useEditorEngine();
    const [domTree, setDomTree] = useState<LayerNode[]>(editorEngine.ast.displayLayers);
    const [treeHovered, setTreeHovered] = useState(false);
    const { ref, width, height } = useResizeObserver();

    useEffect(() => setDomTree(editorEngine.ast.displayLayers), [editorEngine.ast.displayLayers]);
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

    return (
        <div
            ref={ref}
            className="flex h-[calc(100vh-8.25rem)] text-xs text-active flex-grow min-w-fit"
            onMouseOver={() => setTreeHovered(true)}
            onMouseLeave={() => handleMouseLeaveTree()}
        >
            <RightClickMenu>
                <Tree
                    ref={treeRef}
                    data={domTree}
                    openByDefault={true}
                    overscanCount={1}
                    indent={8}
                    padding={0}
                    rowHeight={24}
                    height={(height ?? 8) - 16}
                    width={width ?? 365}
                    renderRow={TreeRow as any}
                >
                    {(props) => <TreeNode {...props} treeHovered={treeHovered} />}
                </Tree>
            </RightClickMenu>
        </div>
    );
});

export default LayersTab;
