'use client';

import { cn } from '@onlook/ui/utils';
import type { ReactNode } from 'react';

type IconOption = {
    value: string;
    icon: ReactNode;
};

type TextOption = {
    value: string;
    label: string;
};

interface InputRadioProps {
    options: (IconOption | TextOption)[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export const InputRadio = ({ options, value, onChange, className }: InputRadioProps) => {
    const isIconOption = (option: IconOption | TextOption): option is IconOption => {
        return 'icon' in option;
    };

    return (
        <div className={cn('flex flex-1', className)}>
            {options.map((option, index) => (
                <button
                    key={option.value}
                    className={cn(
                        "px-1 h-9 text-sm flex-1 cursor-pointer transition-colors",
                        value === option.value
                            ? "bg-background-tertiary text-white"
                            : "bg-background-tertiary/50 text-muted-foreground hover:bg-background-tertiary/70 hover:text-white",
                        index === 0 && "rounded-l-md",
                        index === options.length - 1 && "rounded-r-md"
                    )}
                    onClick={() => onChange(option.value)}
                >
                    {isIconOption(option) ? (
                        <div className="mx-auto w-fit">{option.icon}</div>
                    ) : (
                        option.label
                    )}
                </button>
            ))}
        </div>
    );
};
