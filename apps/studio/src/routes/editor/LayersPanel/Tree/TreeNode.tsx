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
        const hovered = node.data.domId === editorEngine.elements.hovered?.domId;
        const selected = editorEngine.elements.selected.some((el) => el.domId === node.data.domId);
        const instanceId = node.data.instanceId;
        const component = node.data.component;

        function handleHoverNode(e: React.MouseEvent<HTMLDivElement>) {
            if (hovered) {
                return;
            }
            sendMouseEvent(e, node.data, MouseAction.MOVE);
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
            sendMouseEvent(e, node.data, MouseAction.MOUSE_DOWN);
        }

        function parentSelected(node: NodeApi<LayerNode>) {
            if (node.parent) {
                if (
                    editorEngine.elements.selected.some(
                        (el) => el.domId === node.parent?.data.domId,
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
            node: LayerNode,
            action: MouseAction,
        ) {
            const webview = editorEngine.webviews.getWebview(node.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }

            const el: DomElement = await webview.executeJavaScript(
                `window.api?.getDomElementByDomId('${node.domId}', ${action === MouseAction.MOUSE_DOWN})`,
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
                node.data.domId,
            ]);
            editorEngine.action.updateStyle(action);
            node.data.isVisible = !node.data.isVisible;
        }

        function hasComponentAncestor(node: NodeApi<LayerNode>): boolean {
            if (!node) {
                return false;
            }
            if (node.data.instanceId) {
                return true;
            }
            return node.parent ? hasComponentAncestor(node.parent) : false;
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
                                    'text-purple-600 dark:text-purple-300':
                                        hasComponentAncestor(node) && !instanceId && !hovered,
                                    'text-purple-500 dark:text-purple-200':
                                        hasComponentAncestor(node) && !instanceId && hovered,
                                    'text-foreground-onlook':
                                        !hasComponentAncestor(node) &&
                                        !instanceId &&
                                        !selected &&
                                        !hovered,
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
                                    'text-purple-100 dark:text-purple-100': instanceId && selected,
                                    'text-purple-500 dark:text-purple-300': instanceId && !selected,
                                    'text-purple-800 dark:text-purple-200':
                                        instanceId && !selected && hovered,
                                    'bg-purple-700/70 dark:bg-purple-500/50':
                                        instanceId && selected,
                                    'bg-purple-400/30 dark:bg-purple-900/60':
                                        instanceId && !selected && hovered && !parentSelected(node),
                                    'bg-purple-300/30 dark:bg-purple-900/30':
                                        parentSelected(node)?.data.instanceId,
                                    'bg-purple-300/50 dark:bg-purple-900/50':
                                        hovered && parentSelected(node)?.data.instanceId,
                                    'text-white dark:text-primary': !instanceId && selected,
                                }),
                            )}
                        >
                            <span className="w-4 h-4 flex-none relative">
                                {!node.isLeaf && (
                                    <div
                                        className="w-4 h-4 flex items-center justify-center absolute z-50"
                                        onMouseDown={(e) => {
                                            node.select();
                                            sendMouseEvent(e, node.data, MouseAction.MOUSE_DOWN);
                                            node.toggle();
                                        }}
                                    >
                                        {hovered && (
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
                            {instanceId ? (
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
                                        'fill-white dark:fill-primary': !instanceId && selected,
                                        '[&_path]:!fill-purple-600 [&_path]:!dark:fill-purple-300':
                                            hasComponentAncestor(node) &&
                                            !instanceId &&
                                            !selected &&
                                            !hovered &&
                                            !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
                                                node.data.tagName.toLowerCase(),
                                            ),
                                        '[&_path]:!fill-purple-300 [&_path]:!dark:fill-purple-200':
                                            hasComponentAncestor(node) &&
                                            !instanceId &&
                                            !selected &&
                                            hovered &&
                                            !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
                                                node.data.tagName.toLowerCase(),
                                            ),
                                        '[&_path]:!fill-white [&_path]:!dark:fill-primary':
                                            hasComponentAncestor(node) && !instanceId && selected,
                                        '[&_.letter]:!fill-foreground/50 [&_.level]:!fill-foreground dark:[&_.letter]:!fill-foreground/50 dark:[&_.level]:!fill-foreground':
                                            !hasComponentAncestor(node) &&
                                            !selected &&
                                            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
                                                node.data.tagName.toLowerCase(),
                                            ),
                                        '[&_.letter]:!fill-purple-400/50 [&_.level]:!fill-purple-400 dark:[&_.letter]:!fill-purple-300/50 dark:[&_.level]:!fill-purple-300':
                                            hasComponentAncestor(node) &&
                                            !selected &&
                                            !hovered &&
                                            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
                                                node.data.tagName.toLowerCase(),
                                            ),
                                        '[&_.letter]:!fill-purple-300/50 [&_.level]:!fill-purple-300 dark:[&_.letter]:!fill-purple-200/50 dark:[&_.level]:!fill-purple-200':
                                            hasComponentAncestor(node) &&
                                            !selected &&
                                            hovered &&
                                            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
                                                node.data.tagName.toLowerCase(),
                                            ),
                                    })}
                                    node={node.data}
                                />
                            )}
                            <span
                                className={cn(
                                    'truncate space',
                                    instanceId
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
                                {component
                                    ? component
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
