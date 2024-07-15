import { ChevronRightIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeApi, Tree } from 'react-arborist';
import { useEditorEngine } from '..';
import NodeIcon from './NodeIcon';
import { EditorAttributes, WebviewChannels } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';

export const IGNORE_TAGS = ['SCRIPT', 'STYLE'];

export interface LayerNode {
    id: string;
    name: string;
    children?: LayerNode[];
    type: number;
    tagName: string;
    style: {
        display: string;
        flexDirection: string;
    };
}

const LayersTab = observer(() => {
    const treeRef = useRef();
    const editorEngine = useEditorEngine();
    const [domTree, setDomTree] = useState<LayerNode[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);
    const [hoveredNode, setHoveredNode] = useState<NodeApi | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
    const handleMouseOver = useCallback((node: NodeApi) => {
        setHoveredNode((prevNode) => (prevNode?.id === node.id ? prevNode : node));
    }, []);
    const [treeHovered, setTreeHovered] = useState(false);

    useEffect(handleHover, [hoveredNode]);
    useEffect(() => {
        setTimeout(async () => {
            const dom = await editorEngine.webviews.dom;
            const tree: LayerNode[] = [];

            for (const rootNode of dom.values()) {
                const layerNode = parseDOMToLayerNode(rootNode);
                if (layerNode) {
                    tree.push(layerNode);
                }
            }
            setDomTree(tree);
        });
    }, [editorEngine.webviews.dom]);

    useEffect(() => {
        const tree = treeRef.current as any;
        if (!tree) {
            return;
        }

        if (!editorEngine.state.selected.length) {
            tree.deselectAll();
            setSelectedNodeId(undefined);
        }

        const selector = editorEngine.state.selected[0]?.selector;
        if (!selector || selector === selectedNodeId) {
            return;
        }
        setSelectedNodeId(selector);
        tree.select(selector);
    }, [editorEngine.state.selected]);

    function handleHover() {
        const selector = hoveredNode?.id;
        if (!selector) {
            return;
        }
        const webviews = editorEngine.webviews.webviews;
        for (const webview of webviews.values()) {
            const webviewTag = webview.webview;
            webviewTag.send(WebviewChannels.MOUSE_OVER_ELEMENT, { selector });
        }
    }

    async function handleSelect(nodes: NodeApi[]) {
        if (!nodes.length) {
            return;
        }
        const selector = nodes[0].id;
        if (!selector || selector === selectedNodeId) {
            return;
        }
        setSelectedNodeId(selector);
        const webviews = editorEngine.webviews.webviews;
        for (const webview of webviews.values()) {
            const webviewTag = webview.webview;
            webviewTag.send(WebviewChannels.CLICK_ELEMENT, { selector });
        }
    }

    function isValidElement(element: Element) {
        return (
            element &&
            element instanceof Node &&
            element.nodeType == Node.ELEMENT_NODE &&
            !IGNORE_TAGS.includes(element.nodeName) &&
            !element.hasAttribute(EditorAttributes.DATA_ONLOOK_IGNORE)
        );
    }

    function parseDOMToLayerNode(element: Element): LayerNode | undefined {
        if (!isValidElement(element)) {
            return;
        }
        const children = element.children.length
            ? (Array.from(element.children)
                  .map((child) => parseDOMToLayerNode(child as Element))
                  .filter(Boolean) as LayerNode[])
            : undefined;

        const selector =
            element.tagName.toLowerCase() === 'body'
                ? 'body'
                : getUniqueSelector(element as HTMLElement, element.ownerDocument.body);
        return {
            id: selector,
            name: element.tagName.toLowerCase(),
            children: children,
            type: element.nodeType,
            tagName: element.tagName,
            style: {
                display: getComputedStyle(element).display,
                flexDirection: getComputedStyle(element).flexDirection,
            },
        };
    }

    function TreeNode({
        node,
        style,
        dragHandle,
    }: {
        node: NodeApi;
        style: React.CSSProperties;
        dragHandle: React.RefObject<HTMLDivElement>;
    }) {
        return (
            <div
                style={style}
                ref={dragHandle}
                className={clsx(
                    'flex flex-row items-center h-6 rounded-sm',
                    node.isSelected ? 'bg-stone-800 text-white' : 'hover:bg-stone-900',
                )}
                onClick={() => node.select()}
                onMouseOver={() => handleMouseOver(node)}
            >
                <span>
                    {node.isLeaf ? (
                        <div className="w-4"> </div>
                    ) : (
                        <div className="w-4 h-4" onClick={() => node.toggle()}>
                            {treeHovered && (
                                <ChevronRightIcon className={clsx(node.isOpen && 'rotate-90')} />
                            )}
                        </div>
                    )}
                </span>
                <NodeIcon iconClass="w-3 h-3 ml-1 mr-2" node={node.data} />
                <span>{node.data.name}</span>
            </div>
        );
    }

    return (
        <div
            className="flex h-[calc(100vh-8.25rem)] w-60 min-w-60 text-xs p-4 py-2 text-white/60"
            ref={panelRef}
            onMouseOver={() => setTreeHovered(true)}
            onMouseOut={() => setTreeHovered(false)}
        >
            <Tree
                ref={treeRef}
                data={domTree}
                openByDefault={false}
                overscanCount={1}
                width={208}
                indent={8}
                paddingTop={0}
                rowHeight={24}
                height={(panelRef.current?.clientHeight ?? 8) - 16}
                onSelect={handleSelect}
            >
                {TreeNode}
            </Tree>
        </div>
    );
});

export default LayersTab;
