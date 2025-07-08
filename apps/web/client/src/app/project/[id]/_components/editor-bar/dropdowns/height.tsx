'use client';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { LayoutMode } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useDimensionControl } from '../hooks/use-dimension-control';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { InputDropdown } from '../inputs/input-dropdown';

export const Height = observer(() => {
    const { dimensionState, handleDimensionChange, handleUnitChange, handleLayoutChange } =
        useDimensionControl('height');

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'height-dropdown'
    });

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Height" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-1 border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                    >
                        <Icons.Height className="h-4 min-h-4 w-4 min-w-4" />
                        <span className="text-small">
                            {dimensionState.height.value}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="start"
                className="mt-1 w-[280px] space-y-3 rounded-lg p-3"
            >
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-white text-sm">Height</span>
                        <InputDropdown
                            value={dimensionState.height.num ?? 0}
                            unit={dimensionState.height.unit}
                            dropdownValue={dimensionState.height.dropdownValue}
                            dropdownOptions={Object.values(LayoutMode)}
                            onChange={(value) => handleDimensionChange('height', value)}
                            onUnitChange={(value) => handleUnitChange('height', value)}
                            onDropdownChange={(value) => handleLayoutChange('height', value)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Min</span>
                        <InputDropdown
                            value={dimensionState.minHeight.num ?? 0}
                            unit={dimensionState.minHeight.unit}
                            dropdownValue={dimensionState.minHeight.dropdownValue}
                            dropdownOptions={Object.values(LayoutMode)}
                            onChange={(value) => handleDimensionChange('minHeight', value)}
                            onUnitChange={(value) => handleUnitChange('minHeight', value)}
                            onDropdownChange={(value) => handleLayoutChange('minHeight', value)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Max</span>
                        <InputDropdown
                            value={dimensionState.maxHeight.num ?? 0}
                            unit={dimensionState.maxHeight.unit}
                            dropdownValue={dimensionState.maxHeight.dropdownValue}
                            dropdownOptions={Object.values(LayoutMode)}
                            onChange={(value) => handleDimensionChange('maxHeight', value)}
                            onUnitChange={(value) => handleUnitChange('maxHeight', value)}
                            onDropdownChange={(value) => handleLayoutChange('maxHeight', value)}
                        />
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
