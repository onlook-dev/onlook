'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const usePanelMeasurements = (
    leftPanelRef: React.RefObject<HTMLDivElement | null>,
    rightPanelRef: React.RefObject<HTMLDivElement | null>
) => {
    const [toolbarLeft, setToolbarLeft] = useState<number>(0);
    const [toolbarRight, setToolbarRight] = useState<number>(0);
    const [editorBarAvailableWidth, setEditorBarAvailableWidth] = useState<number>(0);

    // Use refs to store current values to avoid effect re-initialization
    const toolbarLeftRef = useRef<number>(0);
    const toolbarRightRef = useRef<number>(0);

    const measure = useCallback(() => {
        const left = leftPanelRef.current?.getBoundingClientRect().right ?? 0;
        const right =
            window.innerWidth -
            (rightPanelRef.current?.getBoundingClientRect().left ?? window.innerWidth);

        // Update refs immediately
        toolbarLeftRef.current = left;
        toolbarRightRef.current = right;

        // Update state to trigger re-renders
        setToolbarLeft(left);
        setToolbarRight(right);
        setEditorBarAvailableWidth(window.innerWidth - left - right);
    }, [leftPanelRef, rightPanelRef]);

    useEffect(() => {
        // Initial measurement
        measure();

        // Measure after DOM paint
        const rafId = requestAnimationFrame(measure);

        // Window resize listener
        const handleResize = () => measure();
        window.addEventListener('resize', handleResize);

        // ResizeObservers for panels - observe both the panels and their children
        const observers: ResizeObserver[] = [];

        const createObserver = (element: HTMLElement) => {
            const observer = new ResizeObserver(() => {
                // Use requestAnimationFrame to debounce rapid changes
                requestAnimationFrame(measure);
            });
            observer.observe(element);

            // Also observe all child elements that might affect width
            const children = element.querySelectorAll('*');
            children.forEach(child => {
                if (child instanceof HTMLElement) {
                    observer.observe(child);
                }
            });

            return observer;
        };

        if (leftPanelRef.current) {
            const leftObserver = createObserver(leftPanelRef.current);
            observers.push(leftObserver);
        }

        if (rightPanelRef.current) {
            const rightObserver = createObserver(rightPanelRef.current);
            observers.push(rightObserver);
        }

        // Polling fallback to catch any missed changes
        const pollInterval = setInterval(() => {
            const currentLeft = leftPanelRef.current?.getBoundingClientRect().right ?? 0;
            const currentRight = window.innerWidth - (rightPanelRef.current?.getBoundingClientRect().left ?? window.innerWidth);

            // Use refs for comparison to avoid dependency on state values
            if (Math.abs(currentLeft - toolbarLeftRef.current) > 1 || Math.abs(currentRight - toolbarRightRef.current) > 1) {
                measure();
            }
        }, 100);

        // MutationObserver to detect DOM changes that might affect panel width
        const mutationObservers: MutationObserver[] = [];

        const createMutationObserver = (element: HTMLElement) => {
            const observer = new MutationObserver(() => {
                requestAnimationFrame(measure);
            });

            observer.observe(element, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'width']
            });

            return observer;
        };

        if (leftPanelRef.current) {
            mutationObservers.push(createMutationObserver(leftPanelRef.current));
        }

        if (rightPanelRef.current) {
            mutationObservers.push(createMutationObserver(rightPanelRef.current));
        }

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', handleResize);
            observers.forEach(observer => observer.disconnect());
            mutationObservers.forEach(observer => observer.disconnect());
            clearInterval(pollInterval);
        };
    }, [measure]); // Only depend on measure callback, not the state values

    return { toolbarLeft, toolbarRight, editorBarAvailableWidth };
};
