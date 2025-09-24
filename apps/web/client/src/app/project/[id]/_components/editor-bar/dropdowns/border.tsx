'use client';

import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { useBoxControl } from '../hooks/use-box-control';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { InputRange } from '../inputs/input-range';
import { SpacingInputs } from '../inputs/spacing-inputs';
import { ToolbarButton } from '../toolbar-button';

export enum BorderTab {
    ALL = 'all',
    INDIVIDUAL = 'individual',
}

export const Border = observer(() => {
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange, borderExists } =
        useBoxControl('border');

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'border-dropdown',
    });

    const areAllBordersEqual = useMemo((): boolean => {
        const borders = {
            top: boxState.borderTopWidth.num ?? 0,
            right: boxState.borderRightWidth.num ?? 0,
            bottom: boxState.borderBottomWidth.num ?? 0,
            left: boxState.borderLeftWidth.num ?? 0,
        };

        const values = Object.values(borders);

        return values.every((val) => val === values[0]);
    }, [
        boxState.borderTopWidth.num,
        boxState.borderRightWidth.num,
        boxState.borderBottomWidth.num,
        boxState.borderLeftWidth.num,
    ]);

    const [activeTab, setActiveTab] = useState<BorderTab>(
        areAllBordersEqual ? BorderTab.ALL : BorderTab.INDIVIDUAL,
    );

    const getBorderDisplay = () => {
        const top = boxState.borderTopWidth.num ?? 0;
        const right = boxState.borderRightWidth.num ?? 0;
        const bottom = boxState.borderBottomWidth.num ?? 0;
        const left = boxState.borderLeftWidth.num ?? 0;

        if (top === 0 && right === 0 && bottom === 0 && left === 0) {
            return null;
        }

        const nonZeroValues = [top, right, bottom, left].filter((val) => val !== 0);

        if (nonZeroValues.length === 4 && nonZeroValues.every((val) => val === nonZeroValues[0])) {
            return boxState.borderWidth.unit === 'px'
                ? `${boxState.borderWidth.num}`
                : `${boxState.borderWidth.value}`;
        }

        return 'Mixed';
    };

    const borderValue = getBorderDisplay();

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip
                content="Border"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className={cn(
                            'flex min-w-9 items-center gap-1',
                            borderValue &&
                                '!text-foreground-primary [&_*]:!text-foreground-primary',
                        )}
                    >
                        <Icons.BorderEdit
                            className={cn('h-4 min-h-4 w-4 min-w-4', borderExists && 'text-white')}
                        />
                        {borderValue && (
                            <span className="data-[state=open]:!text-foreground-primary text-xs !text-white">
                                {borderValue}
                            </span>
                        )}
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="center"
                side="bottom"
                className="mt-1 w-[280px] rounded-lg p-3"
            >
                <div className="mb-3 flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab(BorderTab.ALL)}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${
                            activeTab === BorderTab.ALL
                                ? 'text-foreground-primary bg-background-active/50'
                                : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                        }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab(BorderTab.INDIVIDUAL)}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${
                            activeTab === BorderTab.INDIVIDUAL
                                ? 'text-foreground-primary bg-background-active/50'
                                : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                        }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === BorderTab.ALL ? (
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
