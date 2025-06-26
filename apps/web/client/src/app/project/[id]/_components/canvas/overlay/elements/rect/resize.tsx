import { useEditorEngine } from '@/components/store/editor';
import { adaptValueToCanvas } from '@/components/store/editor/overlay/utils';
import { colors } from '@onlook/ui/tokens';
import React from 'react';

enum ResizeHandlePosition {
    TOP = 'top',
    RIGHT = 'right',
    BOTTOM = 'bottom',
    LEFT = 'left',
    TOP_LEFT = 'top-left',
    TOP_RIGHT = 'top-right',
    BOTTOM_RIGHT = 'bottom-right',
    BOTTOM_LEFT = 'bottom-left',
}

interface HandleProps {
    x: number;
    y: number;
    color: string;
    position: ResizeHandlePosition;
    styles: Record<string, string>;
    handleMouseDown: (
        startEvent: React.MouseEvent,
        position: ResizeHandlePosition,
        styles: Record<string, string>,
    ) => void;
}

const getCursorStyle = (position: ResizeHandlePosition): string => {
    switch (position) {
        case 'top':
        case 'bottom':
            return 'ns-resize';
        case 'left':
        case 'right':
            return 'ew-resize';
        case 'top-left':
        case 'bottom-right':
            return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
            return 'nesw-resize';
        default:
            return 'pointer';
    }
};

const createCaptureOverlay = (startEvent: React.MouseEvent) => {
    const captureOverlay = document.createElement('div');
    captureOverlay.style.position = 'fixed';
    captureOverlay.style.top = '0';
    captureOverlay.style.left = '0';
    captureOverlay.style.width = '100%';
    captureOverlay.style.height = '100%';
    captureOverlay.style.cursor = window.getComputedStyle(startEvent.currentTarget).cursor;
    captureOverlay.style.zIndex = '9999';
    document.body.appendChild(captureOverlay);
    return captureOverlay;
};

interface ResizeDimensions {
    width: number;
    height: number;
}

const calculateNewElementDimensions = (
    position: ResizeHandlePosition,
    startDimensions: ResizeDimensions,
    adjustedDelta: { x: number; y: number },
): ResizeDimensions => {
    const { width: startWidth, height: startHeight } = startDimensions;
    const { x: adjustedDeltaX, y: adjustedDeltaY } = adjustedDelta;

    let newWidth = startWidth;
    let newHeight = startHeight;

    // Handle width changes
    if (position.includes('left')) {
        newWidth = Math.round(Math.max(startWidth - adjustedDeltaX, 0));
    } else if (position.includes('right')) {
        newWidth = Math.round(Math.max(startWidth + adjustedDeltaX, 0));
    }

    // Handle height changes
    if (position.includes('top')) {
        newHeight = Math.round(Math.max(startHeight - adjustedDeltaY, 0));
    } else if (position.includes('bottom')) {
        newHeight = Math.round(Math.max(startHeight + adjustedDeltaY, 0));
    }

    return { width: newWidth, height: newHeight };
};

const calculateNewOverlayDimensions = (
    position: ResizeHandlePosition,
    startDimensions: ResizeDimensions,
    adjustedDelta: { x: number; y: number },
): ResizeDimensions => {
    const { width: startWidth, height: startHeight } = startDimensions;
    const { x: adjustedDeltaX, y: adjustedDeltaY } = adjustedDelta;

    let newWidth = startWidth;
    let newHeight = startHeight;

    // Handle width changes
    if (position.includes('left')) {
        newWidth = Math.max(startWidth - adjustedDeltaX, 0);
    } else if (position.includes('right')) {
        newWidth = Math.max(startWidth + adjustedDeltaX, 0);
    }

    // Handle height changes
    if (position.includes('top')) {
        newHeight = Math.max(startHeight - adjustedDeltaY, 0);
    } else if (position.includes('bottom')) {
        newHeight = Math.max(startHeight + adjustedDeltaY, 0);
    }

    return { width: newWidth, height: newHeight };
};

interface EdgeHandleProps extends HandleProps {
    handleDoubleClick: (e: React.MouseEvent, position: ResizeHandlePosition) => void;
    showHandle: boolean;
}

const HANDLE_CONFIG = {
    EDGE: {
        THICKNESS: 5,
        LENGTH: 32,
        RADIUS: 3.5,
    },
    CORNER: {
        SIZE: 8,
        HIT_AREA: 20,
    },
    INVISIBLE_EDGE: {
        SIZE: 4,
    },
} as const;

const EdgeHandle: React.FC<EdgeHandleProps> = ({
    x,
    y,
    position,
    styles,
    color,
    handleMouseDown,
    handleDoubleClick,
    showHandle = false,
}) => {
    const size = HANDLE_CONFIG.INVISIBLE_EDGE.SIZE;
    const halfSize = size / 2;
    const isVertical =
        position === ResizeHandlePosition.LEFT || position === ResizeHandlePosition.RIGHT;

    const lastClickRef = React.useRef<number>(0);
    const DOUBLE_CLICK_TIMEOUT = 300;

    const handleMouseDownRect = (e: React.MouseEvent) => {
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - lastClickRef.current;
        const doubleClick = timeSinceLastClick < DOUBLE_CLICK_TIMEOUT;

        if (doubleClick) {
            handleDoubleClick(e, position);
            lastClickRef.current = 0;
        } else {
            handleMouseDown(e, position, styles);
            lastClickRef.current = currentTime;
        }
    };

    return (
        <>
            <rect
                x={isVertical ? x - halfSize : 0}
                y={isVertical ? 0 : y - halfSize}
                width={isVertical ? size : '100%'}
                height={isVertical ? '100%' : size}
                fill="transparent"
                style={{ cursor: getCursorStyle(position), pointerEvents: 'auto' }}
                onMouseDown={handleMouseDownRect}
            />
            {showHandle && (
                <rect
                    x={
                        isVertical
                            ? x - HANDLE_CONFIG.EDGE.THICKNESS / 2
                            : x - HANDLE_CONFIG.EDGE.LENGTH / 2
                    }
                    y={
                        isVertical
                            ? y - HANDLE_CONFIG.EDGE.LENGTH / 2
                            : y - HANDLE_CONFIG.EDGE.THICKNESS / 2
                    }
                    width={isVertical ? HANDLE_CONFIG.EDGE.THICKNESS : HANDLE_CONFIG.EDGE.LENGTH}
                    height={isVertical ? HANDLE_CONFIG.EDGE.LENGTH : HANDLE_CONFIG.EDGE.THICKNESS}
                    rx={HANDLE_CONFIG.EDGE.RADIUS}
                    fill="white"
                    stroke={color}
                    strokeWidth={1}
                    style={{ cursor: getCursorStyle(position), pointerEvents: 'auto' }}
                    onMouseDown={handleMouseDownRect}
                />
            )}
        </>
    );
};

const CornerHandle: React.FC<HandleProps> = ({
    x,
    y,
    position,
    color,
    styles,
    handleMouseDown,
}) => {
    const size = HANDLE_CONFIG.CORNER.SIZE;
    const halfSize = size / 2;
    const hitAreaSize = HANDLE_CONFIG.CORNER.HIT_AREA;
    const hitAreaHalfSize = hitAreaSize / 2;

    return (
        <g
            style={{
                pointerEvents: 'auto',
                cursor: getCursorStyle(position),
            }}
            transform={`translate(${x - halfSize}, ${y - halfSize})`}
            onMouseDown={(e) => handleMouseDown(e, position, styles)}
        >
            {/* Invisible larger circle for hit area */}
            <circle cx={halfSize} cy={halfSize} r={hitAreaHalfSize} fill="transparent" />
            <circle
                cx={halfSize}
                cy={halfSize}
                r={halfSize}
                fill="white"
                stroke={color}
                strokeWidth={1}
            />
        </g>
    );
};

const RadiusHandle: React.FC<HandleProps> = ({
    x,
    y,
    position,
    color,
    styles,
    handleMouseDown,
}) => {
    const size = 8;
    const halfSize = size / 2;
    const hitAreaSize = 20;
    const hitAreaHalfSize = hitAreaSize / 2;

    return (
        <g
            style={{
                pointerEvents: 'auto',
                cursor: 'nwse-resize',
            }}
            transform={`translate(${x - halfSize}, ${y - halfSize})`}
            onMouseDown={(e) => handleMouseDown(e, position, styles)}
        >
            <circle cx={halfSize} cy={halfSize} r={hitAreaHalfSize} fill="transparent" />
            <circle
                cx={halfSize}
                cy={halfSize}
                r={halfSize}
                fill="white"
                stroke={color}
                strokeWidth={1}
            />
            <circle cx={halfSize} cy={halfSize} r={1.5} fill={color} />
        </g>
    );
};

interface ResizeHandlesProps {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: number;
    isComponent?: boolean;
    styles: Record<string, string>;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
    width,
    height,
    borderRadius,
    isComponent,
    styles,
}) => {
    const editorEngine = useEditorEngine();
    const color = isComponent ? colors.purple[500] : colors.red[500];
    const enableWidth = styles.width?.endsWith('px');
    const enableHeight = styles.height?.endsWith('px');

    // Calculate radius handle position (20px or 25% of width/height, whichever is smaller)
    const radiusOffset = Math.min(20, width * 0.25, height * 0.25);
    const showRadius = width >= 10 && height >= 10;

    const updateWidth = (newWidth: string) => {
        editorEngine.style.update('width', newWidth);
    };

    const updateHeight = (newHeight: string) => {
        editorEngine.style.update('height', newHeight);
    };

    const updateWidthHeight = (newWidth: string, newHeight: string) => {
        editorEngine.style.updateMultiple({
            width: newWidth,
            height: newHeight,
        });
    };

    const updateRadius = (newRadius: string) => {
        editorEngine.style.update('border-radius', newRadius);
    };

    const handleDoubleClick = (e: React.MouseEvent, position: ResizeHandlePosition) => {
        const isVertical =
            position === ResizeHandlePosition.LEFT || position === ResizeHandlePosition.RIGHT;
        const targetValue = e.altKey ? '100%' : 'fit-content';
        if (isVertical) {
            editorEngine.style.update('width', targetValue);
        } else {
            editorEngine.style.update('height', targetValue);
        }
    };

    const handleMouseDownDimensions = (
        startEvent: React.MouseEvent,
        position: ResizeHandlePosition,
        styles: Record<string, string>,
    ) => {
        startEvent.preventDefault();
        startEvent.stopPropagation();

        editorEngine.history.startTransaction();
        const startX = startEvent.clientX;
        const startY = startEvent.clientY;
        const startDimensions = {
            width: parseFloat(styles.width ?? '0'),
            height: parseFloat(styles.height ?? '0'),
        };

        const captureOverlay = createCaptureOverlay(startEvent);

        const onMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();

            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const adjustedDelta = {
                x: adaptValueToCanvas(deltaX, true),
                y: adaptValueToCanvas(deltaY, true),
            };

            const newElementDimensions = calculateNewElementDimensions(
                position,
                startDimensions,
                adjustedDelta,
            );
            const newOverlayDimensions = calculateNewOverlayDimensions(
                position,
                { width, height },
                {
                    x: deltaX,
                    y: deltaY,
                },
            );

            const widthChanged = newElementDimensions.width !== startDimensions.width;
            const heightChanged = newElementDimensions.height !== startDimensions.height;

            if (widthChanged && heightChanged) {
                updateWidthHeight(
                    `${newElementDimensions.width}px`,
                    `${newElementDimensions.height}px`,
                );
                editorEngine.overlay.state.updateClickedRects({
                    width: newOverlayDimensions.width,
                    height: newOverlayDimensions.height,
                });
            } else if (widthChanged) {
                updateWidth(`${newElementDimensions.width}px`);
                editorEngine.overlay.state.updateClickedRects({
                    width: newOverlayDimensions.width,
                });
            } else if (heightChanged) {
                updateHeight(`${newElementDimensions.height}px`);
                editorEngine.overlay.state.updateClickedRects({
                    height: newOverlayDimensions.height,
                });
            }
        };

        const onMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            upEvent.stopPropagation();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.removeChild(captureOverlay);
            editorEngine.history.commitTransaction();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleMouseDownRadius = (
        startEvent: React.MouseEvent,
        position: ResizeHandlePosition,
        styles: Record<string, string>,
    ) => {
        startEvent.preventDefault();
        startEvent.stopPropagation();

        editorEngine.history.startTransaction();
        const startX = startEvent.clientX;
        const startY = startEvent.clientY;
        const startRadius = borderRadius;

        const captureOverlay = createCaptureOverlay(startEvent);

        const onMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();

            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            // Use the larger of the two deltas for a more natural radius adjustment
            const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY)) * Math.sign(deltaX + deltaY);
            const adjustedDelta = adaptValueToCanvas(delta, true);

            const newRadius = Math.max(0, startRadius + adjustedDelta);
            updateRadius(`${Math.round(newRadius)}px`);
        };

        const onMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            upEvent.stopPropagation();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.removeChild(captureOverlay);
            editorEngine.history.commitTransaction();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <>
            {/* Top Edge handle - only show if height is set */}
            {enableHeight && (
                <EdgeHandle
                    color={color}
                    x={width / 2}
                    y={0}
                    position={ResizeHandlePosition.TOP}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                    handleDoubleClick={handleDoubleClick}
                    showHandle={false}
                />
            )}
            {/* Right Edge handle - only show if width is set */}
            {enableWidth && (
                <EdgeHandle
                    color={color}
                    x={width}
                    y={height / 2}
                    position={ResizeHandlePosition.RIGHT}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                    handleDoubleClick={handleDoubleClick}
                    showHandle={!enableHeight}
                />
            )}
            {/* Bottom Edge handle - only show if height is set */}
            {enableHeight && (
                <EdgeHandle
                    color={color}
                    x={width / 2}
                    y={height}
                    position={ResizeHandlePosition.BOTTOM}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                    handleDoubleClick={handleDoubleClick}
                    showHandle={!enableWidth}
                />
            )}
            {/* Left Edge handle - only show if width is set */}
            {enableWidth && (
                <EdgeHandle
                    color={color}
                    x={0}
                    y={height / 2}
                    position={ResizeHandlePosition.LEFT}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                    handleDoubleClick={handleDoubleClick}
                    showHandle={false}
                />
            )}

            {/* Corner handles - only show if both width and height are set */}
            {enableHeight && enableWidth && (
                <CornerHandle
                    color={color}
                    x={0}
                    y={0}
                    position={ResizeHandlePosition.TOP_LEFT}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                />
            )}
            {enableHeight && enableWidth && (
                <CornerHandle
                    color={color}
                    x={width}
                    y={0}
                    position={ResizeHandlePosition.TOP_RIGHT}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                />
            )}
            {enableHeight && enableWidth && (
                <CornerHandle
                    color={color}
                    x={width}
                    y={height}
                    position={ResizeHandlePosition.BOTTOM_RIGHT}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                />
            )}
            {enableHeight && enableWidth && (
                <CornerHandle
                    color={color}
                    x={0}
                    y={height}
                    position={ResizeHandlePosition.BOTTOM_LEFT}
                    styles={styles}
                    handleMouseDown={handleMouseDownDimensions}
                />
            )}

            {showRadius && (
                <RadiusHandle
                    color={color}
                    x={radiusOffset}
                    y={radiusOffset}
                    position={ResizeHandlePosition.TOP_LEFT}
                    styles={styles}
                    handleMouseDown={handleMouseDownRadius}
                />
            )}
        </>
    );
};
