'use client';

import React from 'react';
import { Border } from './dropdowns/border';
import { BorderColor } from './dropdowns/border-color';
import { ColorBackground } from './dropdowns/color-background';
import { Display } from './dropdowns/display';
import { Height } from './dropdowns/height';
import { Margin } from './dropdowns/margin';
import { Opacity } from './dropdowns/opacity';
import { Padding } from './dropdowns/padding';
import { Radius } from './dropdowns/radius';
import { Width } from './dropdowns/width';
import { useDropdownControl } from './hooks/use-dropdown-manager';
import { useMeasureGroup } from './hooks/use-measure-group';
import { OverflowMenu } from './overflow-menu';
import { InputSeparator } from './separator';
import { AdvancedTypography } from './text-inputs/advanced-typography';
import { FontFamilySelector } from './text-inputs/font/font-family-selector';
import { FontSizeSelector } from './text-inputs/font/font-size';
import { FontWeightSelector } from './text-inputs/font/font-weight';
import { TextAlignSelector } from './text-inputs/text-align';
import { TextColor } from './text-inputs/text-color';

// Group definitions for the text-selected toolbar
export const TEXT_SELECTED_GROUPS = [
    {
        key: 'text-base',
        label: 'Base',
        components: [<ColorBackground />, <Border />, <BorderColor />, <Radius />],
    },
    {
        key: 'text-layout',
        label: 'Layout',
        components: [<Display />, <Padding />, <Margin />],
    },
    {
        key: 'text-font',
        label: 'Font',
        components: [
            <FontFamilySelector />,
            <InputSeparator />,
            <FontWeightSelector />,
            <InputSeparator />,
            <FontSizeSelector />,
        ],
    },
    {
        key: 'text-typography',
        label: 'Typography',
        components: [<TextColor />, <TextAlignSelector />, <AdvancedTypography />],
    },
    {
        key: 'text-opacity',
        label: 'Opacity',
        components: [<Opacity />],
    },
];

const MUST_EXTEND_GROUPS = [
    {
        key: 'text-dimensions',
        label: 'Dimensions',
        components: [<Width />, <Height />],
    },
];

export const TextSelected = ({ availableWidth = 0 }: { availableWidth?: number }) => {
    const { visibleCount } = useMeasureGroup({
        availableWidth,
        count: TEXT_SELECTED_GROUPS.length,
    });
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'text-selected-overflow-dropdown',
        isOverflow: true
    });

    const visibleGroups = TEXT_SELECTED_GROUPS.slice(0, visibleCount);
    const overflowGroups = [...TEXT_SELECTED_GROUPS.slice(visibleCount), ...MUST_EXTEND_GROUPS];

    return (
        <div className="flex items-center justify-center gap-0.5 w-full overflow-hidden">
            {visibleGroups.map((group, groupIdx) => (
                <React.Fragment key={group.key}>
                    {groupIdx > 0 && <InputSeparator />}
                    <div className="flex items-center justify-center gap-0.5">
                        {group.components.map((comp, idx) => (
                            <React.Fragment key={idx}>{comp}</React.Fragment>
                        ))}
                    </div>
                </React.Fragment>
            ))}
            <OverflowMenu
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                overflowGroups={overflowGroups}
                visibleCount={visibleCount}
            />
        </div>
    );
};
