import { ChevronRightIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { NodeApi, Tree, TreeApi } from 'react-arborist';
import { useEditorEngine } from '..';
import NodeIcon from './NodeIcon';
import { WebviewChannels } from '/common/constants';
import { LayerNode } from '/common/models/element/layerNode';
import { TemplateNode } from '/common/models/element/templateNode';

const LayersTab = observer(() => {
    const treeRef = useRef();
    const editorEngine = useEditorEngine();
    const panelRef = useRef<HTMLDivElement>(null);
    const [layerTree, setLayerTree] = useState<LayerNode[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();
    const [treeHovered, setTreeHovered] = useState(false);

    useEffect(() => {
        handleDomChange();
    }, [editorEngine.webviews.dom]);

    useEffect(() => {
        handleScopeChange();
    }, [editorEngine.scope]);

    useEffect(handleSelectStateChange, [editorEngine.state.selected]);

    async function handleScopeChange() {
        if (!editorEngine.scope) {
            return;
        }
        const scope: TemplateNode = JSON.parse(JSON.stringify(editorEngine.scope));
        const ast = await editorEngine.ast.getAstForTemplateNode(scope);
        console.log('AST', ast);
    }

    async function handleDomChange() {
        const dom = await editorEngine.webviews.dom;
        const tree: LayerNode[] = [];

        // Each one is equivalent to
        for (const domBody of dom.values()) {
            const scope = await editorEngine.ast.processDom(domBody);
            editorEngine.scope = scope;
        }

        setLayerTree(tree);
    }

    function handleSelectStateChange() {
        const tree = treeRef.current as TreeApi<LayerNode> | undefined;
        if (!tree) {
            return;
        }

        if (!editorEngine.state.selected.length) {
            tree.deselectAll();
            setSelectedNodes([]);
            return;
        }

        const selectors = editorEngine.state.selected.map((node) => node.selector);

        let firstSelect = true;
        for (const selector of selectors) {
            firstSelect ? tree.select(selector) : tree.selectMulti(selector);
            firstSelect = false;
        }

        setSelectedNodes(selectors);
    }

    async function handleSelectNode(nodes: NodeApi[]) {
        if (!nodes.length) {
            return;
        }
        const selector = nodes[0].id;
        if (!selector || selectedNodes.includes(selector)) {
            return;
        }
        setSelectedNodes([selector]);
        sendMouseEvent(selector, WebviewChannels.CLICK_ELEMENT);
    }

    function handleHoverNode(node: NodeApi) {
        if (hoveredNodeId === node.id) {
            return;
        }
        const selector = node?.id;
        if (!selector) {
            return;
        }
        setHoveredNodeId(node.id);
        sendMouseEvent(selector, WebviewChannels.MOUSE_OVER_ELEMENT);
    }

    function sendMouseEvent(selector: string, channel: WebviewChannels) {
        const webviews = editorEngine.webviews.webviews;
        for (const webview of webviews.values()) {
            const webviewTag = webview.webview;
            webviewTag.send(channel, { selector });
        }
    }

    function TreeNode({ node, style }: { node: NodeApi; style: React.CSSProperties }) {
        const layerNode = node.data as LayerNode;
        const elmentName =
            layerNode.component && layerNode.component !== editorEngine.scope?.component
                ? layerNode.component
                : layerNode.tagName;
        const displayName = elmentName + (layerNode.textContent ? ` ${layerNode.textContent}` : '');

        return (
            <div
                style={style}
                onClick={() => node.select()}
                onMouseOver={() => handleHoverNode(node)}
                className={clsx(
                    'flex flex-row items-center h-6 rounded-sm cursor-pointer',
                    node.isSelected ? 'bg-bg-active text-white' : 'hover:bg-bg',
                )}
            >
                <span className="w-4 h-4">
                    {!node.isLeaf && (
                        <div className="w-4 h-4" onClick={() => node.toggle()}>
                            {treeHovered && (
                                <motion.div
                                    initial={false}
                                    animate={{ rotate: node.isOpen ? 90 : 0 }}
                                >
                                    <ChevronRightIcon />
                                </motion.div>
                            )}
                        </div>
                    )}
                </span>
                <NodeIcon
                    iconClass="w-3 h-3 ml-1 mr-2"
                    node={layerNode}
                    scope={editorEngine.scope?.component}
                />
                <span className="w-full truncate">{displayName}</span>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            className="flex flex-col h-[calc(100vh-8.25rem)] w-60 min-w-60 text-xs p-4 py-2 text-white/60"
            onMouseOver={() => setTreeHovered(true)}
            onMouseOut={() => setTreeHovered(false)}
        >
            <p className="pb-1">Scope: {editorEngine.scope?.component}</p>
            <Tree
                ref={treeRef}
                data={layerTree}
                openByDefault={true}
                overscanCount={1}
                width={208}
                indent={8}
                paddingTop={0}
                rowHeight={24}
                height={(panelRef.current?.clientHeight ?? 8) - 16}
                onSelect={handleSelectNode}
            >
                {TreeNode}
            </Tree>
        </div>
    );
});

export default LayersTab;
