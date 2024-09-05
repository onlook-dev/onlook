export function stringToParsedValue(val: string, percent: boolean = false): [number, string] {
    const matches = val.match(/([-+]?[0-9]*\.?[0-9]+)([a-zA-Z%]*)/);

    let num = matches ? parseFloat(matches[1]) : 0;
    let unit = matches && matches[2] ? matches[2] : '';

    if (percent && unit === '') {
        unit = '%';
        num = num <= 1 ? num * 100 : num;
    }
    return [num, unit];
}

export function parsedValueToString(floatValue: number | string, unit: string): string {
    return `${floatValue}${unit}`;
}
