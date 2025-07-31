import { UNITS } from '@onlook/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface InputRangeProps {
    value: number;
    icon?: keyof typeof Icons;
    unit?: string;
    onChange?: (value: number) => void;
    onUnitChange?: (unit: string) => void;
    customIncrements?: number[];
    useTailwindClasses?: boolean;
}

export const STANDARD_INCREMENTS = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

const TAILWIND_RADIUS_MAP: Record<number, string> = {
    2: 'rounded-xs',
    4: 'rounded-sm', 
    6: 'rounded-md',
    8: 'rounded-lg',
    12: 'rounded-xl',
    16: 'rounded-2xl',
};

export const InputRange = ({
    value,
    icon,
    unit = 'px',
    onChange,
    onUnitChange,
    customIncrements,
    useTailwindClasses = false,
}: InputRangeProps) => {
    const [localValue, setLocalValue] = useState(String(value));
    const rangeRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleValueChange = useCallback((newValue: number) => {
        onChange?.(newValue);
    }, [onChange]);

    useEffect(() => {
        setLocalValue(String(value));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
    };

    const handleBlur = () => {
        const numValue = Number(localValue);
        if (!isNaN(numValue)) {
            handleValueChange(numValue);
        } else {
            setLocalValue(String(value));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const direction = e.key === 'ArrowUp' ? 1 : -1;
            const currentValue = Number(localValue);
            if (!isNaN(currentValue)) {
                const newValue = currentValue + (step * direction);
                setLocalValue(String(newValue));
                handleValueChange(newValue);
            }
        } else if (e.key === 'Enter') {
            handleBlur();
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (rangeRef.current) {
            setIsDragging(true);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    const findClosestIncrement = (targetValue: number): number => {
        if (!customIncrements) return targetValue;
        
        return customIncrements.reduce((closest, current) => {
            return Math.abs(current - targetValue) < Math.abs(closest - targetValue) ? current : closest;
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && rangeRef.current) {
            const rect = rangeRef.current.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const maxValue = customIncrements ? Math.max(...customIncrements) : 500;
            const rawValue = percentage * maxValue;
            const newValue = customIncrements ? findClosestIncrement(rawValue) : Math.round(rawValue);
            setLocalValue(String(newValue));
            handleValueChange(newValue);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const maxValue = customIncrements ? Math.max(...customIncrements) : 500;
    const currentValue = customIncrements ? findClosestIncrement(Number(localValue)) : Number(localValue);

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
                <input
                    ref={rangeRef}
                    type="range"
                    min="0"
                    max={maxValue}
                    value={currentValue}
                    onChange={(e) => {
                        const rawValue = Number(e.target.value);
                        const newValue = customIncrements ? findClosestIncrement(rawValue) : rawValue;
                        setLocalValue(String(newValue));
                        handleValueChange(newValue);
                    }}
                    onMouseDown={handleMouseDown}
                    className="flex-1 h-3 bg-background-tertiary/50 rounded-full appearance-none cursor-pointer relative
                        [&::-webkit-slider-runnable-track]:bg-background-tertiary/50 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-3
                        [&::-moz-range-track]:bg-background-tertiary/50 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:h-3
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:mt-[-2px] [&::-webkit-slider-thumb]:cursor-grab hover:[&::-webkit-slider-thumb]:bg-white/90 active:[&::-webkit-slider-thumb]:cursor-grabbing
                        [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab hover:[&::-moz-range-thumb]:bg-white/90 active:[&::-moz-range-thumb]:cursor-grabbing
                        [&::-ms-thumb]:appearance-none [&::-ms-thumb]:w-4 [&::-ms-thumb]:h-4 [&::-ms-thumb]:rounded-full [&::-ms-thumb]:bg-white [&::-ms-thumb]:cursor-grab hover:[&::-ms-thumb]:bg-white/90 active:[&::-ms-thumb]:cursor-grabbing"
                />
                <div className="flex items-center bg-background-tertiary/50 justify-between rounded-md px-3 h-[36px]">
                    <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        value={localValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="min-w-[40px] max-w-[40px] bg-transparent text-sm text-white focus:outline-none uppercase input-range-text"
                    />

                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger className="text-[12px] text-muted-foreground focus:outline-none cursor-pointer">
                            {unit === 'px' ? '' : unit}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-0 w-[64px]">
                            {UNITS.map((unitOption: string) => (
                                <DropdownMenuItem
                                    key={unitOption}
                                    onClick={() => onUnitChange?.(unitOption)}
                                    className="text-[12px] text-center px-2"
                                >
                                    {unitOption.toUpperCase()}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
};
