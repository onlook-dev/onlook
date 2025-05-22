'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Border } from './dropdowns/border';
import { ColorBackground } from './dropdowns/color-background';
import { Display } from './dropdowns/display';
import { Height } from './dropdowns/height';
import { Margin } from './dropdowns/margin';
import { Opacity } from './dropdowns/opacity';
import { Padding } from './dropdowns/padding';
import { Radius } from './dropdowns/radius';
import { Width } from './dropdowns/width';
import { InputSeparator } from './separator';
import { FontFamilySelector } from './text-inputs/font-family';
import { FontSizeSelector } from './text-inputs/font-size';
import { FontWeightSelector } from './text-inputs/font-weight';

// Group definitions for the div-selected toolbar
export const DIV_SELECTED_GROUPS = [
    {
        key: 'dimensions',
        label: 'Dimensions',
        components: [
            <Width />,
            <Height />,
        ],
    },
    {
        key: 'base',
        label: 'Base',
        components: [
            <ColorBackground />,
            <Border />,
            <Radius />,
        ]
    },
    {
        key: 'layout',
        label: 'Layout',
        components: [
            <Display />,
            <Padding />,
            <Margin />,
        ],
    },
    {
        key: 'typography',
        label: 'Typography',
        components: [
            <FontFamilySelector fontFamily="Arial" />,
            <FontWeightSelector fontWeight="normal" handleFontWeightChange={() => { }} />,
            <FontSizeSelector fontSize={16} handleFontSizeChange={() => { }} />,
        ],
    },
    {
        key: 'opacity',
        label: 'Opacity',
        components: [
            <Opacity />,
        ]
    },
];

export const DivSelected = ({ availableWidth = 0 }: { availableWidth?: number }) => {
    const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [groupWidths, setGroupWidths] = useState<number[]>([]);
    const [overflowOpen, setOverflowOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(DIV_SELECTED_GROUPS.length);

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
        const widths = groupRefs.current.map(ref => calculateGroupWidth(ref));
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

    // Measure group widths after mount and when groupRefs change
    useEffect(() => {
        measureGroups();
    }, [measureGroups, availableWidth]);

    // Update visible count when measurements change
    useEffect(() => {
        updateVisibleCount();
    }, [updateVisibleCount]);

    const visibleGroups = DIV_SELECTED_GROUPS.slice(0, visibleCount);
    const overflowGroups = DIV_SELECTED_GROUPS.slice(visibleCount);

    return (
        <>
            {/* Hidden measurement container */}
            <div style={{ position: 'absolute', visibility: 'hidden', height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {DIV_SELECTED_GROUPS.map((group, groupIdx) => (
                    <div
                        key={group.key}
                        className="flex items-center justify-center gap-0.5"
                        ref={el => { groupRefs.current[groupIdx] = el; }}
                    >
                        {group.components.map((comp, idx) => (
                            <React.Fragment key={idx}>
                                {comp}
                            </React.Fragment>
                        ))}
                    </div>
                ))}
            </div>
            <div
                className="flex items-center justify-center gap-0.5 w-full overflow-hidden"
            >
                {DIV_SELECTED_GROUPS.map((group, groupIdx) => (
                    groupIdx < visibleCount ? (
                        <React.Fragment key={group.key}>
                            {groupIdx > 0 && <InputSeparator />}
                            <div className="flex items-center justify-center gap-0.5">
                                {group.components.map((comp, idx) => (
                                    <React.Fragment key={idx}>
                                        {comp}
                                    </React.Fragment>
                                ))}
                            </div>
                        </React.Fragment>
                    ) : null
                ))}
                {overflowGroups.length > 0 && visibleCount > 0 && <InputSeparator />}
                {overflowGroups.length > 0 && (
                    <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="toolbar"
                                className="w-8 h-8 flex items-center justify-center"
                                aria-label="Show more toolbar controls"
                            >
                                <Icons.DotsHorizontal className="w-5 h-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="flex flex-row gap-1 p-1 px-1 bg-background rounded-lg shadow-xl shadow-black/20 min-w-[fit-content] items-center w-[fit-content]">
                            {overflowGroups.map((group, groupIdx) => (
                                <React.Fragment key={group.key}>
                                    {groupIdx > 0 && <InputSeparator />}
                                    <div className="flex items-center gap-0.5">
                                        {group.components.map((comp, idx) => (
                                            <React.Fragment key={idx}>
                                                {comp}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </React.Fragment>
                            ))}
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </>
    );
};
