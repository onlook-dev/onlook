import { useEditorEngine } from '@/components/store/editor';
import { MouseAction } from '@onlook/models/editor';
import type { DomElement, LayerNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { memo, useCallback, useMemo, useRef } from 'react';
import type { NodeApi } from 'react-arborist';
import { NodeIcon } from './node-icon';

const isComponentAncestor = (node: NodeApi<LayerNode>): boolean => {
    if (!node) {
        return false;
    }
    if (node.data.instanceId) {
        return true;
    }
    return node.parent ? isComponentAncestor(node.parent) : false;
};

const parentSelected = (node: NodeApi<LayerNode>, selectedElements: DomElement[]) => {
    if (!node.parent) {
        return null;
    }
    if (selectedElements.some((el) => el.domId === node.parent?.data.domId)) {
        return node.parent;
    }
    return parentSelected(node.parent, selectedElements);
};

const allAncestorsLastAndOpen = (
    node: NodeApi<LayerNode>,
    selectedParentNode: NodeApi<LayerNode>,
) => {
    if (node.parent && node.parent !== selectedParentNode) {
        if (node.parent.nextSibling || node.parent.isClosed) {
            return false;
        }
        return allAncestorsLastAndOpen(node.parent, selectedParentNode);
    }
    return true;
};

const VisibilityButton = memo(
    ({ isVisible, onClick }: { isVisible: boolean; onClick: () => void }) => (
        <button
            onClick={onClick}
            style={{ position: 'absolute', right: '4px' }}
            className="w-4 h-4"
        >
            {isVisible ? <Icons.EyeOpen /> : <Icons.EyeClosed />}
        </button>
    ),
);

export const TreeNode = memo(
    observer(
        ({
            node,
            style,
            dragHandle,
        }: {
            node: NodeApi<LayerNode>;
            style: React.CSSProperties;
            treeHovered: boolean;
            dragHandle?: React.RefObject<HTMLDivElement> | any;
        }) => {
            const editorEngine = useEditorEngine();
            const isWindow = node.data.tagName.toLowerCase() === 'body';
            const nodeRef = useRef<HTMLDivElement>(null);
            const isText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
                node.data.tagName.toLowerCase(),
            );
            const isWindowSelected =
                isWindow &&
                editorEngine.elements.selected.length === 0 &&
                editorEngine.frames.selected.some((el) => el.frame.id === node.data.frameId);

            const { hovered, selected, isParentSelected } = useMemo(
                () => ({
                    hovered: node.data.domId === editorEngine.elements.hovered?.domId,
                    selected: editorEngine.elements.selected.some(
                        (el) => el.domId === node.data.domId,
                    ),
                    isParentSelected: parentSelected(node, editorEngine.elements.selected),
                }),
                [
                    node.data.domId,
                    editorEngine.elements.hovered?.domId,
                    editorEngine.elements.selected,
                ],
            );

            const sendMouseEvent = useCallback(
                async (
                    e: React.MouseEvent<HTMLDivElement>,
                    node: LayerNode,
                    action: MouseAction,
                ) => {
                    const frameData = editorEngine.frames.get(node.frameId);
                    if (!frameData?.view) {
                        console.error('Failed to get frameView');
                        return;
                    }
                    const el: DomElement = await frameData.view.getElementByDomId(
                        node.domId,
                        action === MouseAction.MOUSE_DOWN,
                    );
                    if (!el) {
                        console.error('Failed to get element');
                        return;
                    }

                    switch (action) {
                        case MouseAction.MOVE:
                            editorEngine.elements.mouseover(el);
                            break;
                        case MouseAction.MOUSE_DOWN:
                            if (isWindow) {
                                editorEngine.clearUI();
                                editorEngine.frames.select([frameData.frame], e.shiftKey);
                                return;
                            }
                            if (e.shiftKey) {
                                editorEngine.elements.shiftClick(el);
                                break;
                            }
                            editorEngine.elements.click([el]);
                            break;
                    }
                },
                [editorEngine, isWindow],
            );

            const handleHoverNode = useCallback(
                async (e: React.MouseEvent<HTMLDivElement>) => {
                    if (hovered) {
                        return;
                    }
                    await sendMouseEvent(e, node.data, MouseAction.MOVE);
                },
                [hovered, node.data, sendMouseEvent],
            );

            const handleSelectNode = useCallback(
                async (e: React.MouseEvent<HTMLDivElement>) => {
                    if (selected) {
                        return;
                    }
                    node.select();
                    await sendMouseEvent(e, node.data, MouseAction.MOUSE_DOWN);
                },
                [selected, node, sendMouseEvent],
            );

            const parentGroupEnd = useCallback(
                (node: NodeApi<LayerNode>) => {
                    if (node.nextSibling || node.isOpen) {
                        return false;
                    }
                    const selectedParent = parentSelected(node, editorEngine.elements.selected);
                    if (selectedParent && allAncestorsLastAndOpen(node, selectedParent)) {
                        return true;
                    }
                },
                [editorEngine.elements.selected],
            );

            const nodeClassName = useMemo(
                () =>
                    cn('flex flex-row items-center h-6 cursor-pointer w-full pr-1', {
                        'text-purple-600 dark:text-purple-300':
                            isComponentAncestor(node) && !node.data.instanceId && !hovered,
                        'text-purple-500 dark:text-purple-200':
                            isComponentAncestor(node) && !node.data.instanceId && hovered,
                        'text-foreground-onlook':
                            !isComponentAncestor(node) &&
                            !node.data.instanceId &&
                            !selected &&
                            !hovered,
                        rounded:
                            (hovered && !isParentSelected && !selected) ||
                            (selected && node.isLeaf) ||
                            (selected && node.isClosed) ||
                            isWindowSelected,
                        'rounded-t': selected && node.isInternal,
                        'rounded-b': isParentSelected && parentGroupEnd(node),
                        'rounded-none': isParentSelected && node.nextSibling,
                        'bg-background-onlook': hovered,
                        'bg-[#FA003C] dark:bg-[#FA003C]/90': selected,
                        'bg-[#FA003C]/10 dark:bg-[#FA003C]/10': isParentSelected,
                        'bg-[#FA003C]/20 dark:bg-[#FA003C]/20': hovered && isParentSelected,
                        'text-purple-100 dark:text-purple-100':
                            node.data.instanceId && selected,
                        'text-purple-500 dark:text-purple-300':
                            node.data.instanceId && !selected,
                        'text-purple-800 dark:text-purple-200':
                            node.data.instanceId && !selected && hovered,
                        'bg-purple-700/70 dark:bg-purple-500/50':
                            node.data.instanceId && selected,
                        'bg-purple-400/30 dark:bg-purple-900/60':
                            node.data.instanceId && !selected && hovered && !isParentSelected,
                        'bg-purple-300/30 dark:bg-purple-900/30':
                            isParentSelected?.data.instanceId,
                        'bg-purple-300/50 dark:bg-purple-900/50':
                            hovered && isParentSelected?.data.instanceId,
                        'text-white dark:text-primary':
                            (!node.data.instanceId && selected) || isWindowSelected,
                        'bg-teal-500': isWindowSelected,
                    }),
                [hovered, selected, isParentSelected, isWindowSelected, parentGroupEnd, node],
            );

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

            function toggleVisibility(): void {
                const visibility = node.data.isVisible ? 'hidden' : 'inherit';
                const action = editorEngine.style.getUpdateStyleAction({ visibility }, [
                    node.data.domId,
                ]);
                editorEngine.action.updateStyle(action);
                node.data.isVisible = !node.data.isVisible;
            }

            function getNodeName() {
                if (isWindow) {
                    return 'window';
                }
                return (
                    (node.data.component
                        ? node.data.component
                        : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(
                            node.data.tagName.toLowerCase(),
                        )
                            ? ''
                            : node.data.tagName.toLowerCase()) +
                    ' ' +
                    node.data.textContent
                );
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
                                className={nodeClassName}
                            >
                                <span className="w-4 h-4 flex-none relative">
                                    {!node.isLeaf && (
                                        <div
                                            className="w-4 h-4 flex items-center justify-center absolute z-50"
                                            onMouseDown={(e) => {
                                                node.select();
                                                sendMouseEvent(
                                                    e,
                                                    node.data,
                                                    MouseAction.MOUSE_DOWN,
                                                );
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
                                {node.data.instanceId ? (
                                    <Icons.Component
                                        className={cn(
                                            'w-3 h-3 ml-1 mb-[1px] mr-1.5 flex-none',
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
                                            'fill-white dark:fill-primary':
                                                !node.data.instanceId && selected,
                                            '[&_path]:!fill-purple-400 [&_path]:!dark:fill-purple-300':
                                                isComponentAncestor(node) &&
                                                !node.data.instanceId &&
                                                !selected &&
                                                !hovered &&
                                                !isText,
                                            '[&_path]:!fill-purple-300 [&_path]:!dark:fill-purple-200':
                                                isComponentAncestor(node) &&
                                                !node.data.instanceId &&
                                                !selected &&
                                                hovered &&
                                                !isText,
                                            '[&_path]:!fill-white [&_path]:!dark:fill-primary':
                                                isComponentAncestor(node) &&
                                                !node.data.instanceId &&
                                                selected,
                                            '[&_.letter]:!fill-foreground/50 [&_.level]:!fill-foreground dark:[&_.letter]:!fill-foreground/50 dark:[&_.level]:!fill-foreground':
                                                !isComponentAncestor(node) && !selected && isText,
                                            '[&_.letter]:!fill-purple-400/50 [&_.level]:!fill-purple-400 dark:[&_.letter]:!fill-purple-300/50 dark:[&_.level]:!fill-purple-300':
                                                isComponentAncestor(node) &&
                                                !selected &&
                                                !hovered &&
                                                isText,
                                            '[&_.letter]:!fill-purple-300/50 [&_.level]:!fill-purple-300 dark:[&_.letter]:!fill-purple-200/50 dark:[&_.level]:!fill-purple-200':
                                                isComponentAncestor(node) &&
                                                !selected &&
                                                hovered &&
                                                isText,
                                        })}
                                        tagName={node.data.tagName}
                                    />
                                )}
                                <span
                                    className={cn(
                                        'truncate space',
                                        node.data.instanceId
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
                                    {getNodeName()}
                                </span>
                                {selected && (
                                    <VisibilityButton
                                        isVisible={node.data.isVisible}
                                        onClick={toggleVisibility}
                                    />
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
                                <p>{node.data.textContent}</p>
                            </TooltipContent>
                        </TooltipPortal>
                    )}
                </Tooltip>
            );
        },
    ),
);
