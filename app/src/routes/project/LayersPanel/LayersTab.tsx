import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import { useEditorEngine } from '..';
import TreeNode from './TreeNode';
import { LayerNode } from '/common/models/element/layers';

const LayersTab = observer(() => {
    const treeRef = useRef<TreeApi<LayerNode>>();
    const editorEngine = useEditorEngine();
    const panelRef = useRef<HTMLDivElement>(null);
    const [domTree, setDomTree] = useState<LayerNode[]>([]);
    const [treeHovered, setTreeHovered] = useState(false);

    console.log('LayersTab');

    useEffect(
        debounce(() => {
            setDomTree(editorEngine.ast.layers);
        }, 500),
        [editorEngine.ast.layers],
    );

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
                onSelect={(node) => {
                    if (node.length === 0) {
                        return;
                    }
                    treeRef.current?.scrollTo(node[0].data.id, 'center');
                }}
            >
                {(props) => <TreeNode {...props} treeHovered={treeHovered} />}
            </Tree>
        </div>
    );
});

export default LayersTab;
