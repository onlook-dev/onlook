import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@onlook/ui-v4/dropdown-menu";

const UNITS = ["PX", "%", "REM", "VW", "VH"] as const;
type Unit = typeof UNITS[number];

interface InputIconProps {
    value: number;
    unit?: Unit;
    onChange?: (value: number) => void;
    onUnitChange?: (unit: Unit) => void;
}

export const InputIcon = ({ 
    value, 
    unit = "PX", 
    onChange,
    onUnitChange 
}: InputIconProps) => {
    const [inputValue, setInputValue] = useState(value.toString());

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

    return (
        <div className="flex items-center bg-background-tertiary/50 justify-between rounded-md px-3 h-[36px] w-full">
            <input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full bg-transparent text-sm text-white focus:outline-none uppercase"
            />
                        
            <DropdownMenu>
                <DropdownMenuTrigger className="text-[12px] text-muted-foreground focus:outline-none cursor-pointer">
                    {unit}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-0 w-[64px]">
                    {UNITS.map((unitOption) => (
                        <DropdownMenuItem
                            key={unitOption}
                            onClick={() => onUnitChange?.(unitOption)}
                            className="text-[12px] text-center px-2"
                        >
                            {unitOption}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
