import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from 'react';
import { debounce } from "lodash";

export const useInputControl = (value: number, onChange?: (value: number) => void) => {
    const [localValue, setLocalValue] = useState<string>(String(value));

    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    const handleIncrement = (step: number) => {
        const currentValue = Number(localValue);
        if (!isNaN(currentValue)) {
            const newValue = currentValue + step;
            setLocalValue(String(newValue));
            debouncedOnChange(newValue);
        }
    };

    const handleChange = (inputValue: string) => {
        setLocalValue(inputValue);
        const numValue = Number(inputValue);
        if (!isNaN(numValue)) {
            debouncedOnChange(numValue);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const direction = e.key === 'ArrowUp' ? 1 : -1;
            handleIncrement(step * direction);
        }
    };

    const debouncedOnChange = useMemo(
        () => debounce((newValue: number) => {
            onChange?.(newValue);
        }, 500),
        [onChange]
    );

    useEffect(() => {
        return () => {
            debouncedOnChange.cancel();
        };
    }, [debouncedOnChange]);

    return { localValue, handleKeyDown, handleChange };
}