import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';

const UNITS = ['px', '%', 'rem', 'vw', 'vh'];
type Unit = (typeof UNITS)[number];

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
    unit?: Unit;
    icon?: IconType;
    onChange?: (value: number) => void;
    onUnitChange?: (unit: Unit) => void;
}

export const InputIcon = ({ value, unit = 'px', icon, onChange, onUnitChange }: InputIconProps) => {
    const [inputValue, setInputValue] = useState(value.toString());
    const [unitValue, setUnitValue] = useState(unit);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        const numericValue = parseFloat(newValue);
        if (!isNaN(numericValue) && onChange) {
            onChange(numericValue);
        }
    };

    const handleBlur = () => {
        const numericValue = parseFloat(inputValue);
        if (isNaN(numericValue)) {
            setInputValue(value.toString());
        }
    };

    const IconComponent = icon ? Icons[icon] : null;

    return (
        <div className="flex items-center gap-2">
            {IconComponent && (
                <IconComponent className="h-5 w-5 min-h-5 min-w-5 text-muted-foreground" />
            )}
            <div className="flex items-center bg-background-tertiary/50 justify-between rounded-md px-3 h-[36px] w-full">
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full bg-transparent text-sm text-white focus:outline-none uppercase hover:text-white"
                />

                <DropdownMenu>
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
