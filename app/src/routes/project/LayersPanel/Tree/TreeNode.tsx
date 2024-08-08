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
import { DomElement, WebViewElement } from '/common/models/element';
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
        }, [editorEngine.ast.map]);

        useEffect(() => {
            setHovered(node.data.id === editorEngine.elements.hovered?.selector);
        }, [editorEngine.elements.hovered]);

        useEffect(() => {
            setSelected(
                editorEngine.elements.selected.some((el) => el.selector === node.data.id) ||
                    node.isSelected,
            );
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
            for (const [webviewId, webviewState] of webviews.entries()) {
                const webviewTag = webviewState.webview;
                const el: DomElement = await webviewTag.executeJavaScript(
                    `window.api.getElementWithSelector('${escapeSelector(selector)}', ${action === MouseAction.CLICK})`,
                );
                const webviewEl: WebViewElement = { ...el, webviewId };
                switch (action) {
                    case MouseAction.MOVE:
                        editorEngine.elements.mouseover(webviewEl, webviewTag);
                        break;
                    case MouseAction.CLICK:
                        editorEngine.elements.click([webviewEl], webviewTag);
                        break;
                }
            }
        }

        return (
            <div
                style={style}
                onClick={() => handleSelectNode()}
                onMouseOver={() => handleHoverNode()}
                className={clsx(
                    'flex flex-row items-center h-6 cursor-pointer min-w-full truncate',
                    hovered ? 'bg-bg' : '',
                    selected ? 'bg-bg-active text-white' : '',
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
                    <Component1Icon className="w-3 h-3 ml-1 mr-2 text-purple" />
                ) : (
                    <NodeIcon iconClass="w-3 h-3 ml-1 mr-2" node={node.data} />
                )}
                <span>
                    {instance?.component ? instance.component : node.data.tagName.toLowerCase()}{' '}
                    {node.data.textContent}
                </span>
            </div>
        );
    },
);

export default TreeNode;
