import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from 'react';
import { debounce } from "lodash";

export const useInputControl = (value: number, onChange?: (value: number) => void, allowNegative: boolean = false, minValue?: number, maxValue?: number, stepSize: number = 0.1) => {
    const [localValue, setLocalValue] = useState<string>(String(value));
    const isEditingRef = useRef(false);

    useEffect(() => {
        // Only update local value from prop if not actively editing
        if (!isEditingRef.current) {
            setLocalValue(String(value));
        }
    }, [value]);

    const handleIncrement = (step: number) => {
        isEditingRef.current = true;
        const currentValue = parseFloat(localValue) || 0;
        let newValue = allowNegative ? currentValue + step : Math.max(0, currentValue + step);
        
        // Apply bounds if specified
        if (minValue !== undefined) newValue = Math.max(minValue, newValue);
        if (maxValue !== undefined) newValue = Math.min(maxValue, newValue);
        
        // Round to 2 decimal places for display
        const roundedValue = Math.round(newValue * 100) / 100;
        setLocalValue(String(roundedValue));
        debouncedOnChange(roundedValue);
    };

    const handleChange = (inputValue: string) => {
        isEditingRef.current = true;
        setLocalValue(inputValue);
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue)) {
            let roundedValue = Math.round(numValue * 100) / 100;
            
            // Apply bounds if specified
            if (minValue !== undefined) roundedValue = Math.max(minValue, roundedValue);
            if (maxValue !== undefined) roundedValue = Math.min(maxValue, roundedValue);
            
            debouncedOnChange(roundedValue);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? stepSize * 10 : stepSize;
            const direction = e.key === 'ArrowUp' ? 1 : -1;
            handleIncrement(step * direction);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
        }
    };

    const debouncedOnChange = useMemo(
        () => debounce((newValue: number) => {
            onChange?.(newValue);
            // Reset editing flag after a delay to allow external updates again
            setTimeout(() => {
                isEditingRef.current = false;
            }, 100);
        }, 300),
        [onChange]
    );

    useEffect(() => {
        return () => {
            debouncedOnChange.cancel();
        };
    }, [debouncedOnChange]);

    return { localValue, handleKeyDown, handleChange };
}