import { ChevronRightIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import { NodeApi, Tree } from 'react-arborist';
import { useEditorEngine } from '..';
import { EditorAttributes } from '/common/constants';

export const IGNORE_TAGS = ['SCRIPT', 'STYLE'];

interface LayerNode {
    id: string;
    name: string;
    children?: LayerNode[];
}

const LayersTab = observer(() => {
    const treeRef = useRef();
    const editorEngine = useEditorEngine();
    const [domTree, setDomTree] = useState<LayerNode[]>([]);

    useEffect(() => {
        setTimeout(async () => {
            const webviews = editorEngine.webviews.getAll();
            const tree: LayerNode[] = [];

            for (const webview of webviews) {
                console.log(webview.id);
                const htmlString = await webview.executeJavaScript(
                    'document.documentElement.outerHTML',
                );
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlString, 'text/html');
                const rootNode = doc.body;
                const layerNode = parseDOMToLayerNode(rootNode);
                if (layerNode) {
                    tree.push(layerNode);
                }
            }
            setDomTree(tree);
        }, 1000);
    }, []);

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
        return {
            id: element.id || nanoid(),
            name: element.tagName.toLowerCase(),
            children: Array.from(element.children)
                .map((child) => parseDOMToLayerNode(child as Element))
                .filter(Boolean) as LayerNode[],
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
                    'flex flex-row items-center space-x-2 h-6 rounded-sm',
                    node.isSelected ? 'bg-stone-800 text-white' : 'hover:bg-stone-900',
                )}
                onClick={() => node.select()}
            >
                <span>
                    {node.isLeaf ? (
                        <div className="w-4"> </div>
                    ) : (
                        <div className="w-4 h-4" onClick={() => node.toggle()}>
                            <motion.div
                                animate={{ rotate: node.isOpen ? 90 : 0 }}
                                transition={{ duration: 0.1 }}
                            >
                                <ChevronRightIcon />
                            </motion.div>
                        </div>
                    )}
                </span>
                <span>{node.data.name}</span>
            </div>
        );
    }

    return (
        <div className="flex w-60 min-w-60 text-xs p-4 py-2 text-white/60">
            <Tree
                ref={treeRef}
                data={domTree}
                openByDefault={false}
                overscanCount={1}
                width={208}
                indent={8}
                className="w-full"
                paddingTop={0}
                rowHeight={24}
            >
                {TreeNode}
            </Tree>
        </div>
    );
});

export default LayersTab;
