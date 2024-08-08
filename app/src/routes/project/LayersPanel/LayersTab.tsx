import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import { useEditorEngine } from '..';
import TreeNode from './Tree/TreeNode';
import TreeRow from './Tree/TreeRow';
import { LayerNode } from '/common/models/element/layers';

const LayersTab = observer(() => {
    const treeRef = useRef<TreeApi<LayerNode>>();
    const editorEngine = useEditorEngine();
    const panelRef = useRef<HTMLDivElement>(null);
    const [domTree, setDomTree] = useState<LayerNode[]>([]);
    const [treeHovered, setTreeHovered] = useState(false);

    useEffect(() => setDomTree(editorEngine.ast.layers), [editorEngine.ast.layers]);

    function handleMouseLeaveTree() {
        setTreeHovered(false);
        editorEngine.overlay.removeHoverRect();
    }

    return (
        <div
            ref={panelRef}
            className="flex h-[calc(100vh-8.25rem)] text-xs text-text"
            onMouseOver={() => setTreeHovered(true)}
            onMouseLeave={() => handleMouseLeaveTree()}
        >
            <Tree
                ref={treeRef}
                data={domTree}
                openByDefault={true}
                overscanCount={1}
                indent={8}
                padding={0}
                rowHeight={24}
                height={(panelRef.current?.clientHeight ?? 8) - 16}
                renderRow={TreeRow as any}
            >
                {(props) => <TreeNode {...props} treeHovered={treeHovered} />}
            </Tree>
        </div>
    );
});

export default LayersTab;
