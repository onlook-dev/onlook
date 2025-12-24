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
import { ToolbarButton } from '../toolbar-button';

export const Width = observer(() => {
    const { dimensionState, handleDimensionChange, handleUnitChange, handleLayoutChange } =
        useDimensionControl('width');

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'width-dropdown'
    });

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Width" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="flex items-center gap-1"
                    >
                        <Icons.Width className="h-4 w-4 min-h-4 min-w-4" />
                        <span className="text-small">
                            {dimensionState.width.value}
                        </span>
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="w-[260px] mt-1 p-3 rounded-lg space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-white">Width</span>
                        <InputDropdown
                            value={dimensionState.width.num ?? 0}
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
                            value={dimensionState.minWidth.num ?? 0}
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
                            value={dimensionState.maxWidth.num ?? 0}
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
})
