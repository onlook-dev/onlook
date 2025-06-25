'use client';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useBoxControl } from '../hooks/use-box-control';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { InputRange } from '../inputs/input-range';
import { SpacingInputs } from '../inputs/spacing-inputs';

export const Border = observer(() => {
    const [activeTab, setActiveTab] = useState('all');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange, borderExists } =
        useBoxControl('border');

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'border-dropdown',
    });

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
            <HoverOnlyTooltip
                content="Border"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                    >
                        <Icons.BorderEdit className="h-4 w-4 min-h-4 min-w-4" />
                        {borderExists && (
                            <span className="text-xs">
                                {boxState.borderWidth.unit === 'px'
                                    ? boxState.borderWidth.num
                                    : boxState.borderWidth.value}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="center"
                side="bottom"
                className="w-[280px] mt-1 p-3 rounded-lg"
            >
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'all'
                            ? 'text-foreground-primary bg-background-active/50'
                            : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                            }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'individual'
                            ? 'text-foreground-primary bg-background-active/50'
                            : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                            }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === 'all' ? (
                    <InputRange
                        value={boxState.borderWidth.num ?? 0}
                        onChange={(value) => handleBoxChange('borderWidth', value.toString())}
                        unit={boxState.borderWidth.unit}
                        onUnitChange={(unit) => handleUnitChange('borderWidth', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="border"
                        values={{
                            top: boxState.borderTopWidth.num ?? 0,
                            right: boxState.borderRightWidth.num ?? 0,
                            bottom: boxState.borderBottomWidth.num ?? 0,
                            left: boxState.borderLeftWidth.num ?? 0,
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
