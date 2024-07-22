import { ChevronRightIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { NodeApi, Tree, TreeApi } from 'react-arborist';
import { useEditorEngine } from '..';
import NodeIcon from './NodeIcon';
import { EditorAttributes, WebviewChannels } from '/common/constants';
import { capitalizeFirstLetter, getUniqueSelector } from '/common/helpers';
import { getTemplateNodeFromElement } from '/common/helpers/template';

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
    const panelRef = useRef<HTMLDivElement>(null);
    const [domTree, setDomTree] = useState<LayerNode[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();
    const [treeHovered, setTreeHovered] = useState(false);

    useEffect(() => {
        handleDomChange();
    }, [editorEngine.webviews.dom]);
    useEffect(handleSelectStateChange, [editorEngine.state.selected]);

    async function handleDomChange() {
        const dom = await editorEngine.webviews.dom;
        const tree: LayerNode[] = [];

        for (const rootNode of dom.values()) {
            const layerNode = parseElToLayerNode(rootNode);
            if (layerNode) {
                tree.push(layerNode);
            }
        }
        setDomTree(tree);
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

    function isValidElement(element: Element) {
        return (
            element &&
            element instanceof Node &&
            element.nodeType == Node.ELEMENT_NODE &&
            !IGNORE_TAGS.includes(element.nodeName) &&
            !element.hasAttribute(EditorAttributes.DATA_ONLOOK_IGNORE)
        );
    }

    function parseElToLayerNode(element: Element): LayerNode | undefined {
        if (!isValidElement(element)) {
            return;
        }
        const children = element.children.length
            ? (Array.from(element.children)
                  .map((child) => parseElToLayerNode(child as Element))
                  .filter(Boolean) as LayerNode[])
            : undefined;

        const selector =
            element.tagName.toLowerCase() === 'body'
                ? 'body'
                : getUniqueSelector(element as HTMLElement, element.ownerDocument.body);

        const textContent = Array.from(element.childNodes)
            .map((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent;
                }
            })
            .join(' ')
            .trim()
            .slice(0, 50);

        const templateNode = getTemplateNodeFromElement(element);
        const name = (templateNode?.name ? templateNode.name : element.tagName.toLowerCase()) || '';
        const displayName = capitalizeFirstLetter(textContent ? `${name}  ${textContent}` : name);

        return {
            id: selector,
            name: displayName,
            children: children,
            type: element.nodeType,
            tagName: element.tagName,
            style: {
                display: getComputedStyle(element).display,
                flexDirection: getComputedStyle(element).flexDirection,
            },
        };
    }

    function TreeNode({ node, style }: { node: NodeApi; style: React.CSSProperties }) {
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
                <NodeIcon iconClass="w-3 h-3 ml-1 mr-2" node={node.data} />
                <span className="w-full truncate">{node.data.name}</span>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            className="flex h-[calc(100vh-8.25rem)] w-60 min-w-60 text-xs p-4 py-2 text-white/60"
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
                onSelect={handleSelectNode}
            >
                {TreeNode}
            </Tree>
        </div>
    );
});

export default LayersTab;
