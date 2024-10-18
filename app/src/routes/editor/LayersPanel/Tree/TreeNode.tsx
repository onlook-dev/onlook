import { useEditorEngine } from '@/components/Context';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRightIcon, Component1Icon } from '@radix-ui/react-icons';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { NodeApi } from 'react-arborist';
import { twMerge } from 'tailwind-merge';
import NodeIcon from './NodeIcon';
import { escapeSelector } from '/common/helpers';
import { MouseAction } from '/common/models';
import { DomElement } from '/common/models/element';
import { LayerNode } from '/common/models/element/layers';

const TreeNode = observer(
    ({
        node,
        style,
        treeHovered,
        dragHandle,
    }: {
        node: NodeApi<LayerNode>;
        style: React.CSSProperties;
        treeHovered: boolean;
        dragHandle?: React.RefObject<HTMLDivElement> | any;
    }) => {
        const editorEngine = useEditorEngine();
        const nodeRef = useRef<HTMLDivElement>(null);
        const hovered = node.data.id === editorEngine.elements.hovered?.selector;
        const selected = editorEngine.elements.selected.some((el) => el.selector === node.data.id);
        const instance = editorEngine.ast.getInstance(node.data.id);

        function handleHoverNode(e: React.MouseEvent<HTMLDivElement>) {
            if (hovered) {
                return;
            }
            sendMouseEvent(e, node.data.id, MouseAction.MOVE);
        }

        function sideOffset() {
            const container = document.getElementById('layer-tab-id');
            const containerRect = container?.getBoundingClientRect();
            const nodeRect = nodeRef?.current?.getBoundingClientRect();
            if (!containerRect || !nodeRect) {
                return 0;
            }
            const scrollLeft = container?.scrollLeft || 0;
            const nodeRightEdge = nodeRect.width + nodeRect.left - scrollLeft;
            const containerWidth = containerRect.width;
            return containerWidth - nodeRightEdge + 10;
        }

        function handleSelectNode(e: React.MouseEvent<HTMLDivElement>) {
            if (selected) {
                return;
            }
            node.select();
            sendMouseEvent(e, node.data.id, MouseAction.MOUSE_DOWN);
        }

        async function sendMouseEvent(
            e: React.MouseEvent<HTMLDivElement>,
            selector: string,
            action: MouseAction,
        ) {
            const webviews = editorEngine.webviews.webviews;
            for (const webviewState of webviews.values()) {
                const webviewTag = webviewState.webview;
                const el: DomElement = await webviewTag.executeJavaScript(
                    `window.api?.getElementWithSelector('${escapeSelector(selector)}', ${action === MouseAction.MOUSE_DOWN})`,
                );
                if (!el) {
                    continue;
                }
                switch (action) {
                    case MouseAction.MOVE:
                        editorEngine.elements.mouseover(el, webviewTag);
                        break;
                    case MouseAction.MOUSE_DOWN:
                        if (e.shiftKey) {
                            editorEngine.elements.shiftClick(el, webviewTag);
                            break;
                        }
                        editorEngine.elements.click([el], webviewTag);
                        break;
                }
            }
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div ref={nodeRef}>
                        <div
                            ref={dragHandle}
                            style={style}
                            onClick={(e) => handleSelectNode(e)}
                            onMouseOver={(e) => handleHoverNode(e)}
                            className={twMerge(
                                clsx(
                                    'flex flex-row items-center h-6 cursor-pointer rounded w-fit min-w-full',
                                    {
                                        'bg-background-onlook': hovered,
                                        'bg-[#FA003C] dark:bg-[#FA003C]/90': selected,
                                        'text-purple-100 dark:text-purple-100':
                                            instance && selected,
                                        'text-purple-500 dark:text-purple-300':
                                            instance && !selected,
                                        'text-purple-800 dark:text-purple-200':
                                            instance && !selected && hovered,
                                        'bg-purple-700/70 dark:bg-purple-500/50':
                                            instance && selected,
                                        'bg-purple-400/30 dark:bg-purple-900/60':
                                            instance && !selected && hovered,
                                        'text-white dark:text-primary': !instance && selected,
                                        'text-hover': !instance && !selected && hovered,
                                        'text-foreground-onlook':
                                            !instance && !selected && !hovered,
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
                                            ? 'text-purple-600 dark:text-purple-200 '
                                            : selected
                                              ? 'text-purple-100 dark:text-purple-100'
                                              : 'text-purple-500 dark:text-purple-300',
                                    )}
                                />
                            ) : (
                                <NodeIcon
                                    iconClass={clsx('w-3 h-3 ml-1 mr-2', {
                                        'fill-white dark:fill-primary': !instance && selected,
                                    })}
                                    node={node.data}
                                />
                            )}
                            <span
                                className={clsx(
                                    'truncate space',
                                    instance
                                        ? selected
                                            ? 'text-purple-100 dark:text-purple-100'
                                            : hovered
                                              ? 'text-purple-600 dark:text-purple-200'
                                              : 'text-purple-500 dark:text-purple-300'
                                        : '',
                                )}
                            >
                                {instance?.component
                                    ? instance.component
                                    : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(
                                            node.data.tagName.toLowerCase(),
                                        )
                                      ? ''
                                      : node.data.tagName.toLowerCase()}
                                {' ' + node.data.textContent}
                            </span>
                        </div>
                    </div>
                </TooltipTrigger>
                {node.data.textContent !== '' && (
                    <TooltipPortal container={document.getElementById('layer-tab-id')}>
                        <TooltipContent
                            side="right"
                            align="center"
                            sideOffset={sideOffset()}
                            className="animation-none max-w-[200px] shadow"
                        >
                            <TooltipArrow className="fill-foreground" />
                            <p>{node.data.textContent}</p>
                        </TooltipContent>
                    </TooltipPortal>
                )}
            </Tooltip>
        );
    },
);

export default TreeNode;
