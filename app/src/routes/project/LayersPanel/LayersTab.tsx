import { ChevronRightIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { NodeApi, Tree, TreeApi } from 'react-arborist';
import { useEditorEngine } from '..';
import NodeIcon from './NodeIcon';
import { EditorAttributes } from '/common/constants';
import { capitalizeFirstLetter, escapeSelector, getUniqueSelector } from '/common/helpers';
import { getTemplateNodeFromElement } from '/common/helpers/template';
import { MouseAction } from '/common/models';
import { DomElement, WebViewElement } from '/common/models/element';

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
    }, [editorEngine.dom.map]);

    useEffect(handleHoverStateChange, [editorEngine.state.hovered]);
    useEffect(handleSelectStateChange, [editorEngine.state.selected]);

    async function handleDomChange() {
        const elements = await editorEngine.dom.elements;
        const tree: LayerNode[] = [];

        for (const rootNode of elements) {
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

    function handleHoverStateChange() {
        const tree = treeRef.current as TreeApi<LayerNode> | undefined;
        if (!tree) {
            return;
        }

        const selector = editorEngine.state.hovered?.selector;
        setHoveredNodeId(selector);
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
        sendMouseEvent(selector, MouseAction.CLICK);
    }

    function handleHoverNode(node: NodeApi) {
        if (hoveredNodeId === node.data.id) {
            return;
        }
        const selector = node?.data.id;
        if (!selector) {
            return;
        }
        setHoveredNodeId(node.data.id);
        sendMouseEvent(selector, MouseAction.HOVER);
    }

    async function sendMouseEvent(selector: string, action: MouseAction) {
        const webviews = editorEngine.webviews.webviews;
        for (const [webviewId, webviewState] of webviews.entries()) {
            const webviewTag = webviewState.webview;
            const el: DomElement = await webviewTag.executeJavaScript(
                `window.api.getElementWithSelector('${escapeSelector(selector)}')`,
            );
            const webviewEl: WebViewElement = { ...el, webviewId };
            switch (action) {
                case MouseAction.HOVER:
                    editorEngine.mouseover([webviewEl], webviewTag);
                    break;
                case MouseAction.CLICK:
                    editorEngine.click([webviewEl], webviewTag);
                    break;
            }
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
                    'flex flex-row items-center h-6 cursor-pointer',
                    node.isSelected ? 'bg-bg-active text-white' : '',
                    node.data.id === hoveredNodeId ? 'bg-bg' : '',
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
            className="flex h-[calc(100vh-8.25rem)] text-xs text-white/60"
            onMouseOver={() => setTreeHovered(true)}
            onMouseOut={() => setTreeHovered(false)}
        >
            <Tree
                ref={treeRef}
                data={domTree}
                openByDefault={false}
                overscanCount={1}
                indent={8}
                padding={0}
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
