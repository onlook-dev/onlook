import { useEditorEngine } from '@/components/Context';
import { adaptValueToCanvas } from '@/lib/editor/engine/overlay/utils';
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
}

const EdgeHandle: React.FC<EdgeHandleProps> = ({
    x,
    y,
    position,
    styles,
    handleMouseDown,
    handleDoubleClick,
}) => {
    const size = 4;
    const halfSize = size / 2;
    const isVertical =
        position === ResizeHandlePosition.LEFT || position === ResizeHandlePosition.RIGHT;

    const lastClickRef = React.useRef<number>(0);
    const DOUBLE_CLICK_TIMEOUT = 300; // milliseconds

    const resetDoubleClickTimer = () => {
        lastClickRef.current = 0;
    };

    const handleSingleClick = (e: React.MouseEvent, currentTime: number) => {
        const timeoutId = setTimeout(() => {
            handleMouseDown(e, position, styles);
        }, DOUBLE_CLICK_TIMEOUT);
        lastClickRef.current = currentTime;
        return timeoutId;
    };

    const handleClick = (e: React.MouseEvent) => {
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - lastClickRef.current;
        const doubleClick = timeSinceLastClick < DOUBLE_CLICK_TIMEOUT;

        if (doubleClick) {
            handleDoubleClick(e, position);
            resetDoubleClickTimer();
        } else {
            const timeoutId = handleSingleClick(e, currentTime);
            const cleanup = () => {
                clearTimeout(timeoutId);
                document.removeEventListener('mousedown', cleanup);
            };
            document.addEventListener('mousedown', cleanup);
        }
    };

    return (
        <rect
            x={isVertical ? x - halfSize : 0}
            y={isVertical ? 0 : y - halfSize}
            width={isVertical ? size : '100%'}
            height={isVertical ? '100%' : size}
            fill="transparent"
            style={{ cursor: getCursorStyle(position), pointerEvents: 'auto' }}
            onMouseDown={handleClick}
        />
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
    const size = 8;
    const halfSize = size / 2;
    const hitAreaSize = 20;
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
    isComponent?: boolean;
    styles: Record<string, string>;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
    width,
    height,
    isComponent,
    styles,
}) => {
    const editorEngine = useEditorEngine();
    const color = isComponent ? colors.purple[500] : colors.red[500];

    // Calculate radius handle position (20px or 25% of width/height, whichever is smaller)
    const radiusOffset = Math.min(20, width * 0.25, height * 0.25);
    const showRadius = false; //width >= 10 && height >= 10;

    const updateWidth = (newWidth: string) => {
        editorEngine.style.update('width', newWidth);
    };

    const updateHeight = (newHeight: string) => {
        editorEngine.style.update('height', newHeight);
    };

    const updateRadius = (newRadius: string) => {
        editorEngine.style.update('border-radius', newRadius);
    };

    const handleDoubleClick = (e: React.MouseEvent, position: ResizeHandlePosition) => {
        const isVertical =
            position === ResizeHandlePosition.LEFT || position === ResizeHandlePosition.RIGHT;
        if (isVertical) {
            editorEngine.style.update('width', e.altKey ? 'fit-content' : '100%');
        } else {
            editorEngine.style.update('height', e.altKey ? 'fit-content' : '100%');
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
            width: parseFloat(styles.width),
            height: parseFloat(styles.height),
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

            // Update styles with new dimensions
            if (newElementDimensions.width !== startDimensions.width) {
                updateWidth(`${newElementDimensions.width}px`);
                editorEngine.overlay.state.updateClickedRects({
                    width: newOverlayDimensions.width,
                });
            }

            if (newElementDimensions.height !== startDimensions.height) {
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
        console.log('handleMouseDownRadius');
    };

    return (
        <>
            {/* Edge handles */}
            <EdgeHandle
                color={color}
                x={width / 2}
                y={0}
                position={ResizeHandlePosition.TOP}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
                handleDoubleClick={handleDoubleClick}
            />
            <EdgeHandle
                color={color}
                x={width}
                y={height / 2}
                position={ResizeHandlePosition.RIGHT}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
                handleDoubleClick={handleDoubleClick}
            />
            <EdgeHandle
                color={color}
                x={width / 2}
                y={height}
                position={ResizeHandlePosition.BOTTOM}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
                handleDoubleClick={handleDoubleClick}
            />
            <EdgeHandle
                color={color}
                x={0}
                y={height / 2}
                position={ResizeHandlePosition.LEFT}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
                handleDoubleClick={handleDoubleClick}
            />

            {/* Corner handles */}
            <CornerHandle
                color={color}
                x={0}
                y={0}
                position={ResizeHandlePosition.TOP_LEFT}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
            />
            <CornerHandle
                color={color}
                x={width}
                y={0}
                position={ResizeHandlePosition.TOP_RIGHT}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
            />
            <CornerHandle
                color={color}
                x={width}
                y={height}
                position={ResizeHandlePosition.BOTTOM_RIGHT}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
            />
            <CornerHandle
                color={color}
                x={0}
                y={height}
                position={ResizeHandlePosition.BOTTOM_LEFT}
                styles={styles}
                handleMouseDown={handleMouseDownDimensions}
            />

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
