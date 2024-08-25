import { ChevronRightIcon, Component1Icon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { NodeApi } from 'react-arborist';
import { useEditorEngine } from '../..';
import NodeIcon from './NodeIcon';
import { escapeSelector } from '/common/helpers';
import { MouseAction } from '/common/models';
import { DomElement } from '/common/models/element';
import { LayerNode } from '/common/models/element/layers';
import { TemplateNode } from '/common/models/element/templateNode';

const TreeNode = observer(
    ({
        node,
        style,
        treeHovered,
    }: {
        node: NodeApi<LayerNode>;
        style: React.CSSProperties;
        treeHovered: boolean;
    }) => {
        const editorEngine = useEditorEngine();
        const [instance, setInstance] = useState<TemplateNode | undefined>();
        const [hovered, setHovered] = useState(false);
        const [selected, setSelected] = useState(
            editorEngine.elements.selected.some((el) => el.selector === node.data.id),
        );

        useEffect(() => {
            let isMounted = true;
            const fetchTemplateNode = async () => {
                if (!instance) {
                    const templateNode = await editorEngine.ast.getInstance(node.data.id);
                    if (isMounted) {
                        setInstance(templateNode);
                    }
                }
            };
            fetchTemplateNode();
            return () => {
                isMounted = false;
            };
        }, [editorEngine.ast.templateNodeMap]);

        useEffect(() => {
            setHovered(node.data.id === editorEngine.elements.hovered?.selector);
        }, [editorEngine.elements.hovered]);

        useEffect(() => {
            if (editorEngine.elements.selected.some((el) => el.selector === node.data.id)) {
                setSelected(true);
            } else {
                setSelected(false);
                node.deselect();
            }
        }, [editorEngine.elements.selected]);

        function handleHoverNode() {
            if (hovered) {
                return;
            }
            sendMouseEvent(node.data.id, MouseAction.MOVE);
        }

        function handleSelectNode() {
            if (selected) {
                return;
            }
            node.select();
            sendMouseEvent(node.data.id, MouseAction.CLICK);
        }

        async function sendMouseEvent(selector: string, action: MouseAction) {
            const webviews = editorEngine.webviews.webviews;
            for (const webviewState of webviews.values()) {
                const webviewTag = webviewState.webview;
                const el: DomElement = await webviewTag.executeJavaScript(
                    `window.api?.getElementWithSelector('${escapeSelector(selector)}', ${action === MouseAction.CLICK})`,
                );
                if (!el) {
                    continue;
                }
                switch (action) {
                    case MouseAction.MOVE:
                        editorEngine.elements.mouseover(el, webviewTag);
                        break;
                    case MouseAction.CLICK:
                        editorEngine.elements.click([el], webviewTag);
                        break;
                }
            }
        }

        return (
            <div
                style={style}
                onMouseDown={() => handleSelectNode()}
                onMouseOver={() => handleHoverNode()}
                className={clsx(
                    'flex flex-row items-center h-6 cursor-pointer min-w-full rounded',
                    hovered ? 'bg-bg' : '',
                    selected ? 'bg-bg-active' : '',
                    {
                        'text-purple-100': instance && selected,
                        'text-purple-300': instance && !selected,
                        'text-purple-200': instance && !selected && hovered,
                        'bg-purple-700/50': instance && selected,
                        'bg-purple-900/60': instance && !selected && hovered,
                        'text-active': !instance && selected,
                        'text-hover': !instance && !selected && hovered,
                        'text-text': !instance && !selected && !hovered,
                    },
                )}
            >
                <span className="w-4 h-4">
                    {!node.isLeaf && (
                        <div
                            className="w-4 h-4 flex items-center justify-center"
                            onClick={() => node.toggle()}
                        >
                            {treeHovered && (
                                <motion.div
                                    initial={false}
                                    animate={{ rotate: node.isOpen ? 90 : 0 }}
                                >
                                    <ChevronRightIcon className="h-2.5 w-2.5" />
                                </motion.div>
                            )}
                        </div>
                    )}
                </span>
                {instance ? (
                    <Component1Icon
                        className={clsx(
                            'w-3 h-3 ml-1 mr-2',
                            hovered && !selected
                                ? 'text-purple-200'
                                : selected
                                  ? 'text-purple-100'
                                  : 'text-purple-300',
                        )}
                    />
                ) : (
                    <NodeIcon iconClass="w-3 h-3 ml-1 mr-2" node={node.data} />
                )}
                <span
                    className={clsx(
                        'truncate w-full',
                        instance
                            ? selected
                                ? 'text-purple-100'
                                : hovered
                                  ? 'text-purple-200'
                                  : 'text-purple-300'
                            : '',
                    )}
                >
                    {instance?.component ? instance.component : node.data.tagName.toLowerCase()}{' '}
                    {node.data.textContent}
                </span>
            </div>
        );
    },
);

export default TreeNode;
