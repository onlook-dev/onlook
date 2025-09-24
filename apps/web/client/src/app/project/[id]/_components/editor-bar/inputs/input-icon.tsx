import { useState } from 'react';

import { UNITS } from '@onlook/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useInputControl } from '../hooks/use-input-control';

type IconType =
    | 'LeftSide'
    | 'TopSide'
    | 'RightSide'
    | 'BottomSide'
    | 'CornerTopLeft'
    | 'CornerTopRight'
    | 'CornerBottomLeft'
    | 'CornerBottomRight';

interface InputIconProps {
    value: number;
    unit?: string;
    icon?: IconType;
    onChange?: (value: number) => void;
    onUnitChange?: (unit: string) => void;
}

export const InputIcon = ({ value, unit = 'px', icon, onChange, onUnitChange }: InputIconProps) => {
    const [unitValue, setUnitValue] = useState(unit);
    const { localValue, handleKeyDown, handleChange } = useInputControl(value, onChange);

    const IconComponent = icon ? Icons[icon] : null;

    return (
        <div className="flex items-center gap-2">
            {IconComponent && (
                <IconComponent className="text-muted-foreground h-5 min-h-5 w-5 min-w-5" />
            )}
            <div className="bg-background-tertiary/50 flex h-[36px] w-full items-center justify-between rounded-md px-3">
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-[40px] bg-transparent text-sm text-white uppercase hover:text-white focus:outline-none"
                />

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="text-muted-foreground cursor-pointer text-[12px] transition-colors hover:text-white focus:outline-none">
                        {unitValue === 'px' ? '' : unitValue}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[64px] min-w-0">
                        {UNITS.map((unitOption) => (
                            <DropdownMenuItem
                                key={unitOption}
                                onClick={() => {
                                    onUnitChange?.(unitOption);
                                    setUnitValue(unitOption);
                                }}
                                className="hover:bg-background-tertiary/70 px-2 text-center text-[12px] transition-colors hover:text-white"
                            >
                                {unitOption}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
