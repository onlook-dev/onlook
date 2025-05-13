'use client';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from "@onlook/ui/tooltip";
import { LayoutMode } from '@onlook/utility';
import { useDimensionControl } from '../hooks/use-dimension-control';
import { InputDropdown } from '../inputs/input-dropdown';

export const Width = () => {
    const { dimensionState, handleDimensionChange, handleUnitChange, handleLayoutChange } =
        useDimensionControl('width');

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        >
                            <Icons.Width className="h-4 w-4 min-h-4 min-w-4" />
                            {(dimensionState.width.unit === 'px'
                                ? dimensionState.width.num !== undefined
                                : (dimensionState.width.value && dimensionState.width.value !== "auto")
                            ) && (
                                <span className="text-smallPlus">
                                    {dimensionState.width.unit === 'px'
                                        ? dimensionState.width.num
                                        : dimensionState.width.value}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Width
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-[260px] mt-1 p-3 rounded-lg space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-white">Width</span>
                        <InputDropdown
                            value={dimensionState.width.num?.toString() ?? '--'}
                            unit={dimensionState.width.unit}
                            dropdownValue={dimensionState.width.dropdownValue}
                            dropdownOptions={Object.values(LayoutMode)}
                            onChange={(value) => handleDimensionChange('width', value)}
                            onUnitChange={(value) => handleUnitChange('width', value)}
                            onDropdownChange={(value) => handleLayoutChange('width', value)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Min</span>
                        <InputDropdown
                            value={dimensionState.minWidth.num?.toString() ?? '--'}
                            unit={dimensionState.minWidth.unit}
                            dropdownValue={dimensionState.minWidth.dropdownValue}
                            dropdownOptions={Object.values(LayoutMode)}
                            onChange={(value) => handleDimensionChange('minWidth', value)}
                            onUnitChange={(value) => handleUnitChange('minWidth', value)}
                            onDropdownChange={(value) => handleLayoutChange('minWidth', value)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Max</span>
                        <InputDropdown
                            value={dimensionState.maxWidth.num?.toString() ?? '--'}
                            unit={dimensionState.maxWidth.unit}
                            dropdownValue={dimensionState.maxWidth.dropdownValue}
                            dropdownOptions={Object.values(LayoutMode)}
                            onChange={(value) => handleDimensionChange('maxWidth', value)}
                            onUnitChange={(value) => handleUnitChange('maxWidth', value)}
                            onDropdownChange={(value) => handleLayoutChange('maxWidth', value)}
                        />
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
