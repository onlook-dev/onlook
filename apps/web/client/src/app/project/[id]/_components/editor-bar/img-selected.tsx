'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import React, { memo, useState } from 'react';
import { Border } from './dropdowns/border';
import { ColorBackground } from './dropdowns/color-background';
import { Height } from './dropdowns/height';
import { ImageBackground } from './dropdowns/img-background';
import { ImgFit } from './dropdowns/img-fit';
import { Margin } from './dropdowns/margin';
import { Opacity } from './dropdowns/opacity';
import { Padding } from './dropdowns/padding';
import { Radius } from './dropdowns/radius';
import { Width } from './dropdowns/width';
import { useMeasureGroup } from './hooks/use-measure-group';
import { ViewButtons } from './panels/panel-bar/bar';
import { InputSeparator } from './separator';

// Group definitions for the img-selected toolbar
export const IMG_SELECTED_GROUPS = [
    {
        key: 'dimensions',
        label: 'Dimensions',
        components: [<Width />, <Height />],
    },
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

export const ImgSelected = memo(({ availableWidth = 0 }: { availableWidth?: number }) => {
    const [overflowOpen, setOverflowOpen] = useState(false);
    const { visibleCount } = useMeasureGroup({ availableWidth, count: IMG_SELECTED_GROUPS.length });

    const visibleGroups = IMG_SELECTED_GROUPS.slice(0, visibleCount);
    const overflowGroups = IMG_SELECTED_GROUPS.slice(visibleCount);

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
                    <PopoverContent
                        align="end"
                        className="flex flex-row gap-1 p-1 px-1 bg-background rounded-lg shadow-xl shadow-black/20 min-w-[fit-content] items-center w-[fit-content]"
                    >
                        {overflowGroups.map((group, groupIdx) => (
                            <React.Fragment key={group.key}>
                                {groupIdx > 0 && <InputSeparator />}
                                <div className="flex items-center gap-0.5">
                                    {group.components.map((comp, idx) => (
                                        <React.Fragment key={idx}>{comp}</React.Fragment>
                                    ))}
                                </div>
                            </React.Fragment>
                        ))}
                    </PopoverContent>
                </Popover>
            )}
            <ViewButtons />
        </div>
    );
});
