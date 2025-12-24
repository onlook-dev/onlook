import { UNITS } from '@onlook/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
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
                <IconComponent className="h-5 w-5 min-h-5 min-w-5 text-muted-foreground" />
            )}
            <div className="flex items-center bg-background-tertiary/50 justify-between rounded-md px-3 h-[36px] w-full">
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-[40px] bg-transparent text-sm text-white focus:outline-none uppercase hover:text-white"
                />

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="text-[12px] text-muted-foreground focus:outline-none cursor-pointer hover:text-white transition-colors">
                        {unitValue === 'px' ? '' : unitValue}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-0 w-[64px]">
                        {UNITS.map((unitOption) => (
                            <DropdownMenuItem
                                key={unitOption}
                                onClick={() => {
                                    onUnitChange?.(unitOption);
                                    setUnitValue(unitOption);
                                }}
                                className="text-[12px] text-center px-2 hover:bg-background-tertiary/70 hover:text-white transition-colors"
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
