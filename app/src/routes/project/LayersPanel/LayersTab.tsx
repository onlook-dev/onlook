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
    const panelRef = useRef<HTMLDivElement>(null);

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
        return {
            id: element.id || nanoid(),
            name: element.tagName.toLowerCase(),
            children: children,
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
        <div
            className="flex h-[calc(100vh-8.25rem)] w-60 min-w-60 text-xs p-4 py-2 text-white/60"
            ref={panelRef}
        >
            <Tree
                ref={treeRef}
                data={domTree}
                openByDefault={true}
                overscanCount={1}
                width={208}
                indent={8}
                paddingTop={0}
                rowHeight={24}
                height={(panelRef.current?.clientHeight ?? 8) - 16}
            >
                {TreeNode}
            </Tree>
        </div>
    );
});

export default LayersTab;
