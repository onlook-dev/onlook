export function stringToParsedValue(val: string, percent = false): { num: number; unit: string } {
    const matches = val.match(/([-+]?[0-9]*\.?[0-9]+)([a-zA-Z%]*)/);

    let num = matches ? Number.parseFloat(matches[1] ?? '0') : 0;
    let unit = matches && matches[2] ? matches[2] : 'px';

    if (percent && unit === '') {
        unit = '%';
        num = num <= 1 ? num * 100 : num;
    }
    return { num, unit };
}
