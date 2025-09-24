'use client';

import { UNITS } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useInputControl } from '../hooks/use-input-control';

const OPTION_OVERRIDES: Record<string, string | undefined> = {
    Fit: 'Hug',
    Relative: 'Rel',
};

interface InputDropdownProps {
    value: number;
    unit?: string;
    dropdownValue: string;
    dropdownOptions?: string[];
    onChange?: (value: number) => void;
    onDropdownChange?: (value: string) => void;
    onUnitChange?: (value: string) => void;
}

export const InputDropdown = ({
    value,
    unit = 'px',
    dropdownValue = 'Hug',
    dropdownOptions = ['Hug'],
    onChange,
    onDropdownChange,
    onUnitChange,
}: InputDropdownProps) => {
    const { localValue, handleKeyDown, handleChange } = useInputControl(value, onChange);

    return (
        <div className="flex items-center">
            <div className="bg-background-tertiary/50 flex h-[36px] min-w-[72px] flex-1 items-center justify-between rounded-l-md px-2.5">
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-[40px] bg-transparent text-left text-sm text-white focus:outline-none"
                    aria-label="Value input"
                />
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="text-muted-foreground cursor-pointer text-sm transition-colors hover:text-white focus:outline-none">
                        {unit}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[64px] min-w-0">
                        {UNITS.map((unitOption: string) => (
                            <DropdownMenuItem
                                key={unitOption}
                                onClick={() => onUnitChange?.(unitOption)}
                                className="hover:bg-background-tertiary/70 flex h-9 w-full items-center justify-center px-2 text-center text-sm transition-colors hover:text-white"
                            >
                                {unitOption.toUpperCase()}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="bg-background-tertiary/50 hover:bg-background-tertiary/70 ml-[1px] flex h-[36px] w-[84px] cursor-pointer items-center justify-between rounded-l-none rounded-r-md px-2.5 transition-colors hover:text-white"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm transition-colors group-hover:text-white">
                                {OPTION_OVERRIDES[dropdownValue] ?? dropdownValue}
                            </span>
                        </div>
                        <Icons.ChevronDown className="text-muted-foreground h-4 min-h-4 w-4 min-w-4 transition-colors group-hover:text-white" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="-mt-[1px] min-w-[100px] rounded-lg p-1"
                >
                    {dropdownOptions.map((option) => (
                        <DropdownMenuItem
                            key={option}
                            onClick={() => onDropdownChange?.(option)}
                            className="text-muted-foreground hover:bg-background-tertiary/70 border-border/0 data-[highlighted]:border-border flex cursor-pointer items-center rounded-md border px-2 py-1.5 text-sm transition-colors hover:text-white"
                        >
                            {OPTION_OVERRIDES[option] ?? option}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
