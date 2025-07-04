import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const useDebouncedInput = (
    initialValue: string,
    onChange: (value: string) => void,
    delay: number = 500,
) => {
    const [localValue, setLocalValue] = useState(initialValue);

    // Update local value when initial value changes
    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);

    // Create debounced onChange handler
    const debouncedOnChange = useMemo(
        () =>
            debounce((value: string) => {
                onChange(value);
            }, delay),
        [onChange, delay],
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedOnChange.cancel();
        };
    }, [debouncedOnChange]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            setLocalValue(newValue);
            debouncedOnChange(newValue);
        },
        [debouncedOnChange],
    );

    return { localValue, handleChange };
};
