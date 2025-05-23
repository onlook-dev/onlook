import { useEffect, useRef, useState } from 'react';
import { useCallback } from 'react';
import { DIV_SELECTED_GROUPS } from '../div-selected';

export const useMeasureGroup = ({ availableWidth = 0, count = 0 }: { availableWidth?: number, count?: number }) => {
    const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [groupWidths, setGroupWidths] = useState<number[]>([]);
    const [visibleCount, setVisibleCount] = useState(count);


    // Calculate total width of a group including margins and padding
    const calculateGroupWidth = useCallback((element: HTMLElement | null): number => {
        if (!element) return 0;
        const style = window.getComputedStyle(element);
        const width = element.offsetWidth;
        const marginLeft = parseFloat(style.marginLeft);
        const marginRight = parseFloat(style.marginRight);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingRight = parseFloat(style.paddingRight);
        return width + marginLeft + marginRight + paddingLeft + paddingRight;
    }, []);

    // Measure all group widths
    const measureGroups = useCallback(() => {
        const widths = groupRefs.current.map((ref) => calculateGroupWidth(ref));
        setGroupWidths(widths);
    }, [calculateGroupWidth]);

    // Update visible count based on available width
    const updateVisibleCount = useCallback(() => {
        if (!groupWidths.length || !availableWidth) return;

        const OVERFLOW_BUTTON_WIDTH = 32; // Reduced from 48px
        const MIN_GROUP_WIDTH = 80; // Reduced from 100px
        const SEPARATOR_WIDTH = 8; // Width of the InputSeparator
        let used = 0;
        let count = 0;

        for (let i = 0; i < groupWidths.length; i++) {
            const width = groupWidths[i] ?? 0;
            if (width < MIN_GROUP_WIDTH) continue;

            // Add separator width if this isn't the first group
            const totalWidth = width + (count > 0 ? SEPARATOR_WIDTH : 0);

            if (used + totalWidth <= availableWidth - OVERFLOW_BUTTON_WIDTH) {
                used += totalWidth;
                count++;
            } else {
                break;
            }
        }

        setVisibleCount(count);
    }, [groupWidths, availableWidth]);

    // Update visible count when measurements change
    useEffect(() => {
        updateVisibleCount();
    }, [updateVisibleCount]);

    // Measure group widths after mount and when groupRefs change
    useEffect(() => {
        measureGroups();
    }, [measureGroups, availableWidth]);

    return {
        groupRefs,
        visibleCount,
    };
};
