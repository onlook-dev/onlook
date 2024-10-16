export function stringToParsedValue(
    val: string,
    percent: boolean = false,
): { numberVal: string; unitVal: string } {
    const matches = val.match(/([-+]?[0-9]*\.?[0-9]+)([a-zA-Z%]*)/);

    let num = matches ? parseFloat(matches[1]) : 0;
    let unit = matches && matches[2] ? matches[2] : '';

    if (percent && unit === '') {
        unit = '%';
        num = num <= 1 ? num * 100 : num;
    }
    return { numberVal: num.toString(), unitVal: unit };
}

export function parsedValueToString(floatValue: number | string, unit: string): string {
    return `${floatValue}${unit}`;
}

export const getDefaultUnit = (unit: string): string => {
    return unit === '' ? 'px' : unit;
};

export const handleNumberInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    key: string,
    value: string,
    setValue: (value: string) => void,
    sendStyleUpdate: (value: string) => void,
) => {
    const { numberVal, unitVal } = stringToParsedValue(value, key === 'opacity');
    const newUnit = getDefaultUnit(unitVal);

    if (e.key === 'Enter') {
        const newValue = parsedValueToString(numberVal, newUnit);
        sendStyleUpdate(newValue);
        e.currentTarget.blur();
        return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = e.key === 'ArrowUp' ? step : -step;

        const newNumber = parseInt(numberVal) + delta;
        const newValue = parsedValueToString(newNumber, newUnit);

        setValue(newValue);
        sendStyleUpdate(newValue);
    }
};
