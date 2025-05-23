import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from 'react';
import { debounce } from "lodash";

export const useInputControl = (value: number, onChange?: (value: number) => void) => {
    const [localValue, setLocalValue] = useState<number>(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleIncrement = (step: number) => {
        if (!isNaN(localValue)) {
            const newValue = (localValue + step);
            handleChange(newValue);
        }
    };

    const handleChange = (value: number) => {
        setLocalValue(value);
        debouncedOnChange(value);
    }

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