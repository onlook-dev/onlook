import { colors } from '@onlook/ui/tokens';
import React from 'react';

enum ResizeHandleType {
    CORNER = 'corner',
    EDGE = 'edge',
    RADIUS = 'radius',
}

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

interface BaseHandleProps {
    x: number;
    y: number;
    color: string;
    position: ResizeHandlePosition;
    styles: Record<string, string>;
}

interface ResizeHandleProps extends BaseHandleProps {
    type: ResizeHandleType;
}

const getCursorStyle = (position: ResizeHandleProps['position']): string => {
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

const handleMouseDown = (
    startEvent: React.MouseEvent,
    position: string,
    type: 'corner' | 'edge' | 'radius',
    styles: Record<string, string>,
) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    // Create and append overlay to capture mouse events
    const captureOverlay = createCaptureOverlay(startEvent);

    const onMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
    };

    const onMouseUp = (upEvent: MouseEvent) => {
        upEvent.preventDefault();
        upEvent.stopPropagation();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // Remove overlay
        document.body.removeChild(captureOverlay);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};

const EdgeHandle: React.FC<BaseHandleProps> = ({ x, y, position, styles }) => {
    const size = 4;
    const halfSize = size / 2;
    const isVertical = position === 'left' || position === 'right';

    return (
        <rect
            x={isVertical ? x - halfSize : 0}
            y={isVertical ? 0 : y - halfSize}
            width={isVertical ? size : '100%'}
            height={isVertical ? '100%' : size}
            fill="transparent"
            style={{ cursor: getCursorStyle(position), pointerEvents: 'auto' }}
            onMouseDown={(e) => handleMouseDown(e, position, ResizeHandleType.EDGE, styles)}
        />
    );
};

const CornerHandle: React.FC<BaseHandleProps> = ({ x, y, position, color, styles }) => {
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
            onMouseDown={(e) => handleMouseDown(e, position, ResizeHandleType.CORNER, styles)}
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

const RadiusHandle: React.FC<BaseHandleProps> = ({ x, y, position, color, styles }) => {
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
            onMouseDown={(e) => handleMouseDown(e, position, ResizeHandleType.RADIUS, styles)}
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
    const color = isComponent ? colors.purple[500] : colors.red[500];

    // Calculate radius handle position (20px or 25% of width/height, whichever is smaller)
    const radiusOffset = Math.min(20, width * 0.25, height * 0.25);
    const showRadius = width >= 10 && height >= 10;

    return (
        <>
            {/* Edge handles */}
            <EdgeHandle
                color={color}
                x={width / 2}
                y={0}
                position={ResizeHandlePosition.TOP}
                styles={styles}
            />
            <EdgeHandle
                color={color}
                x={width}
                y={height / 2}
                position={ResizeHandlePosition.RIGHT}
                styles={styles}
            />
            <EdgeHandle
                color={color}
                x={width / 2}
                y={height}
                position={ResizeHandlePosition.BOTTOM}
                styles={styles}
            />
            <EdgeHandle
                color={color}
                x={0}
                y={height / 2}
                position={ResizeHandlePosition.LEFT}
                styles={styles}
            />

            {/* Corner handles */}
            <CornerHandle
                color={color}
                x={0}
                y={0}
                position={ResizeHandlePosition.TOP_LEFT}
                styles={styles}
            />
            <CornerHandle
                color={color}
                x={width}
                y={0}
                position={ResizeHandlePosition.TOP_RIGHT}
                styles={styles}
            />
            <CornerHandle
                color={color}
                x={width}
                y={height}
                position={ResizeHandlePosition.BOTTOM_RIGHT}
                styles={styles}
            />
            <CornerHandle
                color={color}
                x={0}
                y={height}
                position={ResizeHandlePosition.BOTTOM_LEFT}
                styles={styles}
            />

            {showRadius && (
                <RadiusHandle
                    color={color}
                    x={radiusOffset}
                    y={radiusOffset}
                    position={ResizeHandlePosition.TOP_LEFT}
                    styles={styles}
                />
            )}
        </>
    );
};
