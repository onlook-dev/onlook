'use client';

import React, { memo } from 'react';
import { Border } from './dropdowns/border';
import { ColorBackground } from './dropdowns/color-background';
import { Height } from './dropdowns/height';
import { Margin } from './dropdowns/margin';
import { Padding } from './dropdowns/padding';
import { Radius } from './dropdowns/radius';
import { Width } from './dropdowns/width';
import { useDropdownControl } from './hooks/use-dropdown-manager';
import { useMeasureGroup } from './hooks/use-measure-group';
import { OverflowMenu } from './overflow-menu';
import { InputSeparator } from './separator';

// Group definitions for the img-selected toolbar
export const IMG_SELECTED_GROUPS = [
    {
        key: 'base',
        label: 'Base',
        components: [<ColorBackground />, <Border />, <Radius />],
    },
    {
        key: 'layout',
        label: 'Layout',
        components: [<Padding />, <Margin />],
    },
    // {
    //     key: 'image',
    //     label: 'Image',
    //     components: [<ImgFit />, <ImageBackground />],
    // },
    // {
    //     key: 'opacity',
    //     label: 'Opacity',
    //     components: [<Opacity />],
    // },
];

const MUST_EXTEND_GROUPS = [
    {
        key: 'dimensions',
        label: 'Dimensions',
        components: [<Width />, <Height />],
    },
]

export const ImgSelected = memo(({ availableWidth = 0 }: { availableWidth?: number }) => {
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'img-selected-overflow-dropdown',
    });
    const { visibleCount } = useMeasureGroup({ availableWidth, count: IMG_SELECTED_GROUPS.length });

    const visibleGroups = IMG_SELECTED_GROUPS.slice(0, visibleCount);
    const overflowGroups = [...IMG_SELECTED_GROUPS.slice(visibleCount), ...MUST_EXTEND_GROUPS];

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
});
