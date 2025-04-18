import type { SingleStyle } from '@/lib/editor/styles/models';
import { toast } from '@onlook/ui/use-toast';

export function parsedValueToString(num: string, unit: string): string {
    return `${num}${unit}`;
}

export const getDefaultUnit = (unit: string): string => {
    return unit === '' ? 'px' : unit;
};

export const handleNumberInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    elementStyle: SingleStyle,
    value: string,
    setValue: (value: string) => void,
    sendStyleUpdate: (value: string) => void,
) => {
    const { numberVal, unitVal } = stringToParsedValue(value, elementStyle.key === 'opacity');
    const newUnit = getDefaultUnit(unitVal);

    if (e.key === 'Enter') {
        e.currentTarget.blur();
        return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = e.key === 'ArrowUp' ? step : -step;

        const newNumber = parseFloat(numberVal) + delta;
        const newValue = parsedValueToString(newNumber.toString(), newUnit);
        const { min, max } = elementStyle.params || {};

        if (min !== undefined && newNumber < min) {
            toast({
                title: 'Invalid Input',
                description: `Value for ${elementStyle.displayName} cannot be less than ${min}.`,
                variant: 'destructive',
            });
            return;
        }

        if (max !== undefined && newNumber > max) {
            toast({
                title: 'Invalid Input',
                description: `Value for ${elementStyle.displayName} cannot be greater than ${max}.`,
                variant: 'destructive',
            });
            return;
        }
        setValue(newValue);
        sendStyleUpdate(newValue);
    }
};
