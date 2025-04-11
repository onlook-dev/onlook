"use client";

import { Icons } from "@onlook/ui-v4/icons";
import type { ReactNode } from "react";

type IconOption = {
    value: string;
    icon: ReactNode;
};

type TextOption = {
    value: string;
    label: string;
};

interface InputRadioProps {
    label?: string;
    options: (IconOption | TextOption)[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export const InputRadio = ({ label, options, value, onChange, className }: InputRadioProps) => {
    const isIconOption = (option: IconOption | TextOption): option is IconOption => {
        return 'icon' in option;
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {label && <span className="text-sm text-muted-foreground w-20">{label}</span>}
            <div className="flex gap-1 flex-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        className={`flex-1 flex items-center justify-center text-sm px-1 py-2.5 rounded-md ${
                            value === option.value 
                                ? "bg-background-tertiary/20 text-white" 
                                : "text-muted-foreground hover:bg-background-tertiary/10"
                        }`}
                        onClick={() => onChange(option.value)}
                    >
                        {isIconOption(option) ? option.icon : option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
