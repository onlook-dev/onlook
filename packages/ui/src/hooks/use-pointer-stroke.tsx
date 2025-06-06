import type React from 'react';
import { useCallback, useRef, type DependencyList } from 'react';

interface UsePointerStrokeOptions<T extends Element, InitData> {
    onBegin: (e: React.PointerEvent<T>) => InitData;
    onMove: (
        e: React.PointerEvent<T>,
        moves: {
            totalDeltaX: number;
            totalDeltaY: number;
            deltaX: number;
            deltaY: number;
            initData: InitData;
        },
    ) => void;
    onEnd?: (
        e: React.PointerEvent<T>,
        moves: {
            totalDeltaX: number;
            totalDeltaY: number;
            initData: InitData;
        },
    ) => void;
    onHover?: (e: React.PointerEvent<T>) => void;
}

interface State<InitData> {
    initX: number;
    initY: number;
    lastX: number;
    lastY: number;
    initData: InitData;
}

export function usePointerStroke<T extends Element = Element, InitData = void>(
    { onBegin, onMove, onEnd, onHover }: UsePointerStrokeOptions<T, InitData>,
    deps?: DependencyList,
): {
    onPointerDown: (e: React.PointerEvent<T>) => void;
    onPointerMove: (e: React.PointerEvent<T>) => void;
    onPointerUp: (e: React.PointerEvent<T>) => void;
} {
    const stateRef = useRef<State<InitData> | null>(null);

    const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
        if (e.button !== 0) {
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        const x = Math.round(e.clientX);
        const y = Math.round(e.clientY);
        const initData = onBegin(e);
        stateRef.current = {
            initX: x,
            initY: y,
            lastX: x,
            lastY: y,
            initData,
        };
    }, deps as DependencyList);

    const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
        if (!stateRef.current) {
            onHover?.(e);
            return;
        }

        const x = Math.round(e.clientX);
        const y = Math.round(e.clientY);
        const { initX, initY, lastX, lastY } = stateRef.current;

        if (e.buttons === 0) {
            // In some cases `onPointerUp` will not fire. Finish the stroke here
            // and forward the last movement so state remains consistent.
            const deltaX = x - lastX;
            const deltaY = y - lastY;
            stateRef.current.lastX = x;
            stateRef.current.lastY = y;
            onMove(e, {
                totalDeltaX: x - initX,
                totalDeltaY: y - initY,
                deltaX,
                deltaY,
                initData: stateRef.current.initData,
            });
            e.currentTarget.releasePointerCapture(e.pointerId);
            onEnd?.(e, {
                totalDeltaX: x - initX,
                totalDeltaY: y - initY,
                initData: stateRef.current.initData,
            });
            stateRef.current = null;
            return;
        }

        stateRef.current.lastX = x;
        stateRef.current.lastY = y;
        onMove(e, {
            totalDeltaX: x - initX,
            totalDeltaY: y - initY,
            deltaX: x - lastX,
            deltaY: y - lastY,
            initData: stateRef.current.initData,
        });
    }, deps as DependencyList);

    const onPointerUp = useCallback((e: React.PointerEvent<T>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (!stateRef.current) {
            return;
        }

        const x = Math.round(e.clientX);
        const y = Math.round(e.clientY);
        const { initX, initY } = stateRef.current;

        onEnd?.(e, {
            totalDeltaX: x - initX,
            totalDeltaY: y - initY,
            initData: stateRef.current.initData,
        });
        stateRef.current = null;
    }, deps as DependencyList);

    return { onPointerDown, onPointerMove, onPointerUp };
}

export function usePointerStrokeCapture<T extends Element = Element, InitData = void>(
    options: UsePointerStrokeOptions<T, InitData>,
    deps?: DependencyList,
): {
    onPointerDownCapture: (e: React.PointerEvent<T>) => void;
    onPointerMoveCapture: (e: React.PointerEvent<T>) => void;
    onPointerUpCapture: (e: React.PointerEvent<T>) => void;
} {
    const props = usePointerStroke(options, deps);
    return {
        onPointerDownCapture: props.onPointerDown,
        onPointerMoveCapture: props.onPointerMove,
        onPointerUpCapture: props.onPointerUp,
    };
}
