import { useEditorEngine } from '@/components/store/editor';
import { adaptRectToCanvas, adaptValueToCanvas } from '@/components/store/editor/overlay/utils';
import type { RectDimensions } from '@onlook/models';
import { colors } from '@onlook/ui/tokens';
import React, { memo, useMemo } from 'react';
import { BaseRect } from './rect/base';

interface Point {
    x: number;
    y: number;
}

interface Distance {
    value: number;
    start: Point;
    end: Point;
    supportLine?: {
        start: Point;
        end: Point;
    };
}

interface RectPoint extends RectDimensions {
    right: number;
    bottom: number;
}

interface MeasurementProps {
    fromRect: RectDimensions;
    toRect: RectDimensions;
}

const toRectPoint = (rect: RectDimensions): RectPoint => ({
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top,
});

const isBetween = (x: number, start: number, end: number): boolean => {
    return (start <= x && x <= end) || (end <= x && x <= start);
};

const isIntersect = (rectA: RectPoint, rectB: RectPoint): boolean => {
    if (rectA.left > rectB.right || rectB.left > rectA.right) {
        return false;
    }
    if (rectA.top > rectB.bottom || rectB.top > rectA.bottom) {
        return false;
    }
    return true;
};

const getInsideRect = (rectA: RectPoint, rectB: RectPoint): RectPoint | null => {
    if (
        rectA.left >= rectB.left &&
        rectA.right <= rectB.right &&
        rectA.top >= rectB.top &&
        rectA.bottom <= rectB.bottom
    ) {
        return rectA;
    } else if (
        rectB.left >= rectA.left &&
        rectB.right <= rectA.right &&
        rectB.top >= rectA.top &&
        rectB.bottom <= rectA.bottom
    ) {
        return rectB;
    }
    return null;
};

export const MeasurementOverlay: React.FC<MeasurementProps> = memo(({ fromRect, toRect }) => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.get(editorEngine.elements.selected[0]?.frameId ?? '');
    const frameView = frameData?.view;

    const fromRectAdjusted = useMemo(
        () => (frameView ? adaptRectToCanvas(fromRect, frameView) : fromRect),
        [fromRect, frameView],
    );
    const toRectAdjusted = useMemo(
        () => (frameView ? adaptRectToCanvas(toRect, frameView) : toRect),
        [toRect, frameView],
    );

    const fromRectPoint = useMemo(() => toRectPoint(fromRect), [fromRect]);
    const toRectPointResult = useMemo(() => toRectPoint(toRect), [toRect]);

    type DistanceWithoutSupportLine = Omit<Distance, 'supportLine'>;

    const createDistance = (
        distance: DistanceWithoutSupportLine,
        toRect: RectPoint,
        isHorizontal: boolean,
    ): Distance => {
        const result: Distance = { ...distance };
        const { start, end } = distance;

        if (isHorizontal && !isBetween(start.y, toRect.top, toRect.bottom)) {
            result.supportLine = {
                start: { x: end.x, y: toRect.top },
                end: { x: end.x, y: end.y },
            };
        } else if (!isHorizontal && !isBetween(start.x, toRect.left, toRect.right)) {
            result.supportLine = {
                start: { x: toRect.left, y: end.y },
                end: { x: end.x, y: end.y },
            };
        }

        return result;
    };

    const distances = useMemo(() => {
        if (!frameView) {
            return [];
        }
        const result: Distance[] = [];

        // Scale values for display
        const scaleValue = (value: number) => adaptValueToCanvas(Math.abs(value), true);

        // Calculate horizontal distances
        let y = fromRectPoint.top + fromRectPoint.height / 2;
        if (isIntersect(fromRectPoint, toRectPointResult)) {
            const insideRect = getInsideRect(toRectPointResult, fromRectPoint);
            if (insideRect) {
                y = insideRect.top + insideRect.height / 2;
            } else if (fromRectPoint.bottom > toRectPointResult.bottom) {
                y = fromRectPoint.top + (toRectPointResult.bottom - fromRectPoint.top) / 2;
            } else {
                y = fromRectPoint.bottom - (fromRectPoint.bottom - toRectPointResult.top) / 2;
            }

            const leftDistance: Distance = {
                value: scaleValue(fromRectPoint.left - toRectPointResult.left),
                start: { x: fromRectPoint.left, y },
                end: { x: toRectPointResult.left, y },
            };
            if (!isBetween(y, toRectPointResult.top, toRectPointResult.bottom)) {
                leftDistance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x: toRectPointResult.left, y },
                };
            }
            result.push(leftDistance);

            const rightDistance: Distance = {
                value: scaleValue(fromRectPoint.right - toRectPointResult.right),
                start: { x: fromRectPoint.right, y },
                end: { x: toRectPointResult.right, y },
            };
            if (!isBetween(y, toRectPointResult.top, toRectPointResult.bottom)) {
                rightDistance.supportLine = {
                    start: { x: toRectPointResult.right, y: toRectPointResult.top },
                    end: { x: toRectPointResult.right, y },
                };
            }
            result.push(rightDistance);
        } else if (fromRectPoint.left > toRectPointResult.right) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.left - toRectPointResult.right),
                start: { x: fromRectPoint.left, y },
                end: { x: toRectPointResult.right, y },
            };
            if (!isBetween(y, toRectPointResult.top, toRectPointResult.bottom)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.right, y: toRectPointResult.top },
                    end: { x: toRectPointResult.right, y },
                };
            }
            result.push(distance);
        } else if (fromRectPoint.right < toRectPointResult.left) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.right - toRectPointResult.left),
                start: { x: fromRectPoint.right, y },
                end: { x: toRectPointResult.left, y },
            };
            if (!isBetween(y, toRectPointResult.top, toRectPointResult.bottom)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x: toRectPointResult.left, y },
                };
            }
            result.push(distance);
        } else if (
            isBetween(fromRectPoint.left, toRectPointResult.left, toRectPointResult.right) &&
            fromRectPoint.right >= toRectPointResult.left
        ) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.left - toRectPointResult.left),
                start: { x: fromRectPoint.left, y },
                end: { x: toRectPointResult.left, y },
            };
            if (!isBetween(y, toRectPointResult.top, toRectPointResult.bottom)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x: toRectPointResult.left, y },
                };
            }
            result.push(distance);
        } else if (
            isBetween(fromRectPoint.right, toRectPointResult.left, toRectPointResult.right) &&
            fromRectPoint.left <= toRectPointResult.left
        ) {
            result.push(
                createDistance(
                    {
                        value: scaleValue(fromRectPoint.right - toRectPointResult.right),
                        start: { x: fromRectPoint.right, y },
                        end: { x: toRectPointResult.right, y },
                    },
                    toRectPointResult,
                    true,
                ),
            );
        } else {
            result.push(
                createDistance(
                    {
                        value: scaleValue(fromRectPoint.left - toRectPointResult.left),
                        start: { x: fromRectPoint.left, y },
                        end: { x: toRectPointResult.left, y },
                    },
                    toRectPointResult,
                    true,
                ),
            );
            result.push(
                createDistance(
                    {
                        value: scaleValue(fromRectPoint.right - toRectPointResult.right),
                        start: { x: fromRectPoint.right, y },
                        end: { x: toRectPointResult.right, y },
                    },
                    toRectPointResult,
                    true,
                ),
            );
        }

        // Calculate vertical distances
        let x = fromRectPoint.left + fromRectPoint.width / 2;
        if (isIntersect(fromRectPoint, toRectPointResult)) {
            const insideRect = getInsideRect(toRectPointResult, fromRectPoint);
            if (insideRect) {
                x = insideRect.left + insideRect.width / 2;
            } else if (fromRectPoint.right > toRectPointResult.right) {
                x = fromRectPoint.left + (toRectPointResult.right - fromRectPoint.left) / 2;
            } else {
                x = fromRectPoint.right - (fromRectPoint.right - toRectPointResult.left) / 2;
            }

            const topDistance: Distance = {
                value: scaleValue(fromRectPoint.top - toRectPointResult.top),
                start: { x, y: fromRectPoint.top },
                end: { x, y: toRectPointResult.top },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                topDistance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x, y: toRectPointResult.top },
                };
            }
            result.push(topDistance);

            const bottomDistance: Distance = {
                value: scaleValue(fromRectPoint.bottom - toRectPointResult.bottom),
                start: { x, y: fromRectPoint.bottom },
                end: { x, y: toRectPointResult.bottom },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                bottomDistance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.bottom },
                    end: { x, y: toRectPointResult.bottom },
                };
            }
            result.push(bottomDistance);
        } else if (fromRectPoint.top > toRectPointResult.bottom) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.top - toRectPointResult.bottom),
                start: { x, y: fromRectPoint.top },
                end: { x, y: toRectPointResult.bottom },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.bottom },
                    end: { x, y: toRectPointResult.bottom },
                };
            }
            result.push(distance);
        } else if (fromRectPoint.bottom < toRectPointResult.top) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.bottom - toRectPointResult.top),
                start: { x, y: fromRectPoint.bottom },
                end: { x, y: toRectPointResult.top },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x, y: toRectPointResult.top },
                };
            }
            result.push(distance);
        } else if (isBetween(fromRectPoint.top, toRectPointResult.top, toRectPointResult.bottom)) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.top - toRectPointResult.top),
                start: { x, y: fromRectPoint.top },
                end: { x, y: toRectPointResult.top },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x, y: toRectPointResult.top },
                };
            }
            result.push(distance);
        } else if (
            isBetween(fromRectPoint.bottom, toRectPointResult.top, toRectPointResult.bottom)
        ) {
            const distance: Distance = {
                value: scaleValue(fromRectPoint.bottom - toRectPointResult.bottom),
                start: { x, y: fromRectPoint.bottom },
                end: { x, y: toRectPointResult.bottom },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                distance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.bottom },
                    end: { x, y: toRectPointResult.bottom },
                };
            }
            result.push(distance);
        } else {
            const topDistance: Distance = {
                value: scaleValue(fromRectPoint.top - toRectPointResult.top),
                start: { x, y: fromRectPoint.top },
                end: { x, y: toRectPointResult.top },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                topDistance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.top },
                    end: { x, y: toRectPointResult.top },
                };
            }
            result.push(topDistance);

            const bottomDistance: Distance = {
                value: scaleValue(fromRectPoint.bottom - toRectPointResult.bottom),
                start: { x, y: fromRectPoint.bottom },
                end: { x, y: toRectPointResult.bottom },
            };
            if (!isBetween(x, toRectPointResult.left, toRectPointResult.right)) {
                bottomDistance.supportLine = {
                    start: { x: toRectPointResult.left, y: toRectPointResult.bottom },
                    end: { x, y: toRectPointResult.bottom },
                };
            }
            result.push(bottomDistance);
        }

        return result;
    }, [fromRectPoint, toRectPointResult]);

    const viewBox = useMemo(
        () => ({
            minX: Math.min(fromRectAdjusted.left, toRectAdjusted.left) - 100,
            minY: Math.min(fromRectAdjusted.top, toRectAdjusted.top) - 100,
            width:
                Math.abs(toRectAdjusted.left - fromRectAdjusted.left) +
                Math.max(fromRectAdjusted.width, toRectAdjusted.width) +
                200,
            height:
                Math.abs(toRectAdjusted.top - fromRectAdjusted.top) +
                Math.max(fromRectAdjusted.height, toRectAdjusted.height) +
                200,
        }),
        [fromRectAdjusted, toRectAdjusted],
    );

    const svgContent = (
        <g transform={`translate(${-viewBox.minX},${-viewBox.minY})`}>
            <rect
                x={fromRect.left}
                y={fromRect.top}
                width={fromRect.width}
                height={fromRect.height}
                fill="none"
                stroke={colors.red[500]}
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <rect
                x={toRect.left}
                y={toRect.top}
                width={toRect.width}
                height={toRect.height}
                fill="none"
                stroke={colors.red[500]}
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Distance lines and labels */}
            {distances.map((distance, index) => {
                const isHorizontal = distance.start.y === distance.end.y;
                const midX = (distance.start.x + distance.end.x) / 2 + (isHorizontal ? 24 : 0);
                const midY = (distance.start.y + distance.end.y) / 2 + (isHorizontal ? 0 : 16);

                return (
                    <g key={index}>
                        <line
                            x1={distance.start.x}
                            y1={distance.start.y}
                            x2={distance.end.x}
                            y2={distance.end.y}
                            stroke={colors.red[500]}
                            strokeWidth={1}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {distance.supportLine && (
                            <line
                                x1={distance.supportLine.start.x}
                                y1={distance.supportLine.start.y}
                                x2={distance.supportLine.end.x}
                                y2={distance.supportLine.end.y}
                                stroke={colors.red[500]}
                                strokeWidth={1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="10 6"
                            />
                        )}
                        <g transform={`translate(${midX},${midY})`}>
                            <rect
                                x={-20}
                                y={-10}
                                width={40}
                                height={20}
                                fill={colors.red[500]}
                                rx={2}
                            />
                            <text
                                x={0}
                                y={0}
                                fill="white"
                                fontSize={12}
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                {Math.round(distance.value)}
                            </text>
                        </g>
                    </g>
                );
            })}
        </g>
    );

    return (
        <BaseRect
            width={viewBox.width}
            height={viewBox.height}
            top={viewBox.minY}
            left={viewBox.minX}
            strokeWidth={0}
        >
            {svgContent}
        </BaseRect>
    );
});

MeasurementOverlay.displayName = 'MeasurementOverlay';
