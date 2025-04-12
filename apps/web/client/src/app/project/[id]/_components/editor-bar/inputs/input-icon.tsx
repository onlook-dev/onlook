import { Icons } from "@onlook/ui-v4/icons";
import { useState } from "react";

interface InputIconProps {
    icon: keyof typeof Icons;
    value: number;
    unit?: string;
    onChange?: (value: number) => void;
}

export const InputIcon = ({ icon, value, unit = "px", onChange }: InputIconProps) => {
    const Icon = Icons[icon];
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
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
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
                            
                <span className="text-[12px] text-muted-foreground uppercase">{unit}</span>
            </div>
        </div>
    );
};
