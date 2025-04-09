import { Icons } from "@onlook/ui-v4/icons";
import { useState, useEffect } from "react";

interface InputRangeProps {
    value: number;
    icon?: keyof typeof Icons;
    unit?: string;
    onChange?: (value: number) => void;
}

export const InputRange = ({ value, icon, unit = "px", onChange }: InputRangeProps) => {
    const Icon = icon ? Icons[icon] : Icons.Padding;
    const [inputValue, setInputValue] = useState(String(value));

    useEffect(() => {
        setInputValue(String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
    };

    const handleBlur = () => {
        const numValue = Number(inputValue);
        if (!isNaN(numValue)) {
            onChange?.(numValue);
        } else {
            setInputValue(String(value));
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
                <input
                    type="range"
                    min="0"
                    max="500"
                    value={value}
                    onChange={(e) => onChange?.(Number(e.target.value))}
                    className="flex-1 h-3 bg-background-tertiary/50 rounded-full appearance-none cursor-pointer 
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:mt-[-2px] hover:[&::-webkit-slider-thumb]:bg-white/90
                        [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 hover:[&::-moz-range-thumb]:bg-white/90
                        [&::-ms-thumb]:appearance-none [&::-ms-thumb]:w-4 [&::-ms-thumb]:h-4 [&::-ms-thumb]:rounded-full [&::-ms-thumb]:bg-white hover:[&::-ms-thumb]:bg-white/90"
                />
                <div className="flex items-center bg-background-tertiary/50 justify-between rounded-md px-3 h-[36px]">
                    <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={inputValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="min-w-[40px] max-w-[40px] bg-transparent text-sm text-white focus:outline-none uppercase"
                    />
                    <span className="text-[12px] text-muted-foreground uppercase">{unit}</span>
                </div>
            </div>
        </div>
    );
};
