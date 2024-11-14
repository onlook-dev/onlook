import { useEditorEngine } from '@/components/Context';
import { MouseAction } from '@onlook/models/editor';
import type { DomElement, LayerNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import type { NodeApi } from 'react-arborist';
import { twMerge } from 'tailwind-merge';
import NodeIcon from './NodeIcon';
import { escapeSelector } from '/common/helpers';

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

        function parentSelected(node: NodeApi<LayerNode>) {
            if (node.parent) {
                if (
                    editorEngine.elements.selected.some(
                        (el) => el.selector === node.parent?.data.id,
                    )
                ) {
                    return node.parent;
                }
                return parentSelected(node.parent);
            }
            return null;
        }

        function allAncestorsLastAndOpen(
            node: NodeApi<LayerNode>,
            selectedParentNode: NodeApi<LayerNode>,
        ) {
            if (node.parent && node.parent !== selectedParentNode) {
                if (node.parent.nextSibling || node.parent.isClosed) {
                    return false;
                }
                return allAncestorsLastAndOpen(node.parent, selectedParentNode);
            }
            return true;
        }

        function parentGroupEnd(node: NodeApi<LayerNode>) {
            if (node.nextSibling || node.isOpen) {
                return false;
            }
            const selectedParent = parentSelected(node);
            if (selectedParent && allAncestorsLastAndOpen(node, selectedParent)) {
                return true;
            }
        }

        async function sendMouseEvent(
            e: React.MouseEvent<HTMLDivElement>,
            selector: string,
            action: MouseAction,
        ) {
            const webviewId = editorEngine.ast.getWebviewId(selector);
            if (!webviewId) {
                console.warn('Failed to get webview id');
                return;
            }
            const webview = editorEngine.webviews.getWebview(webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }

            const el: DomElement = await webview.executeJavaScript(
                `window.api?.getElementWithSelector('${escapeSelector(selector)}', ${action === MouseAction.MOUSE_DOWN})`,
            );
            if (!el) {
                console.error('Failed to get element');
                return;
            }

            switch (action) {
                case MouseAction.MOVE:
                    editorEngine.elements.mouseover(el, webview);
                    break;
                case MouseAction.MOUSE_DOWN:
                    if (e.shiftKey) {
                        editorEngine.elements.shiftClick(el, webview);
                        break;
                    }
                    editorEngine.elements.click([el], webview);
                    break;
            }
        }

        function toggleVisibility(): void {
            const visibility = node.data.isVisible ? 'hidden' : 'inherit';
            const action = editorEngine.style.getUpdateStyleAction('visibility', visibility, [
                node.data.id,
            ]);
            editorEngine.action.updateStyle(action);
            node.data.isVisible = !node.data.isVisible;
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div ref={nodeRef}>
                        <div
                            ref={dragHandle}
                            style={style}
                            onMouseDown={(e) => handleSelectNode(e)}
                            onMouseOver={(e) => handleHoverNode(e)}
                            className={twMerge(
                                cn('flex flex-row items-center h-6 cursor-pointer w-full pr-1', {
                                    rounded:
                                        (hovered && !parentSelected(node) && !selected) ||
                                        (selected && node.isLeaf) ||
                                        (selected && node.isClosed),
                                    'rounded-t': selected && node.isInternal,
                                    'rounded-b': parentSelected(node) && parentGroupEnd(node),
                                    'rounded-none': parentSelected(node) && node.nextSibling,
                                    'bg-background-onlook': hovered,
                                    'bg-[#FA003C] dark:bg-[#FA003C]/90': selected,
                                    'bg-[#FA003C]/10 dark:bg-[#FA003C]/10': parentSelected(node),
                                    'bg-[#FA003C]/20 dark:bg-[#FA003C]/20':
                                        hovered && parentSelected(node),
                                    'text-purple-100 dark:text-purple-100': instance && selected,
                                    'text-purple-500 dark:text-purple-300': instance && !selected,
                                    'text-purple-800 dark:text-purple-200':
                                        instance && !selected && hovered,
                                    'bg-purple-700/70 dark:bg-purple-500/50': instance && selected,
                                    'bg-purple-400/30 dark:bg-purple-900/60':
                                        instance && !selected && hovered && !parentSelected(node),
                                    'bg-purple-300/30 dark:bg-purple-900/30':
                                        editorEngine.ast.getInstance(
                                            parentSelected(node)?.data.id || '',
                                        ),
                                    'bg-purple-300/50 dark:bg-purple-900/50':
                                        hovered &&
                                        editorEngine.ast.getInstance(
                                            parentSelected(node)?.data.id || '',
                                        ),
                                    'text-white dark:text-primary': !instance && selected,
                                    'text-hover': !instance && !selected && hovered,
                                    'text-foreground-onlook': !instance && !selected && !hovered,
                                }),
                            )}
                        >
                            <span className="w-4 h-4 flex-none">
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
                                                <Icons.ChevronRight className="h-2.5 w-2.5" />
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </span>
                            {instance ? (
                                <Icons.Component
                                    className={cn(
                                        'w-3 h-3 ml-1 mr-2 flex-none',
                                        hovered && !selected
                                            ? 'text-purple-600 dark:text-purple-200 '
                                            : selected
                                              ? 'text-purple-100 dark:text-purple-100'
                                              : 'text-purple-500 dark:text-purple-300',
                                    )}
                                />
                            ) : (
                                <NodeIcon
                                    iconClass={cn('w-3 h-3 ml-1 mr-2 flex-none', {
                                        'fill-white dark:fill-primary': !instance && selected,
                                    })}
                                    node={node.data}
                                />
                            )}
                            <span
                                className={cn(
                                    'truncate space',
                                    instance
                                        ? selected
                                            ? 'text-purple-100 dark:text-purple-100'
                                            : hovered
                                              ? 'text-purple-600 dark:text-purple-200'
                                              : 'text-purple-500 dark:text-purple-300'
                                        : '',
                                    !node.data.isVisible && 'opacity-80',
                                    selected && 'mr-5',
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
                            {selected && (
                                <button
                                    onClick={toggleVisibility}
                                    style={{ position: 'absolute', right: '4px' }}
                                    className="w-4 h-4"
                                >
                                    {node.data.isVisible ? <Icons.EyeOpen /> : <Icons.EyeClosed />}
                                </button>
                            )}
                        </div>
                    </div>
                </TooltipTrigger>
                {node.data.textContent !== '' && (
                    <TooltipPortal container={document.getElementById('style-panel')}>
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
