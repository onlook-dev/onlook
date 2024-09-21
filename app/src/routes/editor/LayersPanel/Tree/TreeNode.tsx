import { useEditorEngine } from '@/components/Context';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRightIcon, Component1Icon } from '@radix-ui/react-icons';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { NodeApi } from 'react-arborist';
import { twMerge } from 'tailwind-merge';
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
        const [instance, setInstance] = useState<TemplateNode | undefined>(
            editorEngine.ast.getInstance(node.data.id),
        );
        const [hovered, setHovered] = useState(false);
        const [selected, setSelected] = useState(
            editorEngine.elements.selected.some((el) => el.selector === node.data.id),
        );
        const nodeRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            setInstance(editorEngine.ast.getInstance(node.data.id));
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
        function sideOffset() {
            const container = document.getElementById('layer-tab-id');
            const containerRect = container?.getBoundingClientRect();
            const nodeRect = nodeRef.current?.getBoundingClientRect();
            if (!containerRect || !nodeRect) {
                return 0;
            }
            const scrollLeft = container?.scrollLeft || 0;
            const nodeRightEdge = nodeRect.width + nodeRect.left - scrollLeft;
            const containerWidth = containerRect.width;
            return containerWidth - nodeRightEdge + 10;
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
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        ref={nodeRef}
                        style={style}
                        onClick={() => handleSelectNode()}
                        onMouseOver={() => handleHoverNode()}
                        className={twMerge(
                            clsx(
                                'flex flex-row items-center h-6 cursor-pointer rounded w-fit min-w-full',
                                {
                                    'bg-bg': hovered,
                                    'bg-stone-800': selected,
                                    'text-purple-100': instance && selected,
                                    'text-purple-300': instance && !selected,
                                    'text-purple-200': instance && !selected && hovered,
                                    'bg-purple-700/50': instance && selected,
                                    'bg-purple-900/60': instance && !selected && hovered,
                                    'text-active': !instance && selected,
                                    'text-hover': !instance && !selected && hovered,
                                    'text-text': !instance && !selected && !hovered,
                                },
                            ),
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
                                'truncate',
                                instance
                                    ? selected
                                        ? 'text-purple-100'
                                        : hovered
                                          ? 'text-purple-200'
                                          : 'text-purple-300'
                                    : '',
                            )}
                        >
                            {instance?.component
                                ? instance.component
                                : node.data.tagName.toLowerCase()}{' '}
                            {node.data.textContent}
                        </span>
                    </div>
                </TooltipTrigger>
                {node.data.textContent !== '' && (
                    <TooltipPortal container={document.getElementById('layer-tab-id')}>
                        <TooltipContent
                            side="right"
                            align="center"
                            sideOffset={sideOffset()}
                            className="animation-none"
                        >
                            <TooltipArrow className="fill-black" />
                            <p>{node.data.textContent}</p>
                        </TooltipContent>
                    </TooltipPortal>
                )}
            </Tooltip>
        );
    },
);

export default TreeNode;
