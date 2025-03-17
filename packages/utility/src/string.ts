export function isEmptyString(str: string): boolean {
    return str.trim() === '';
}

export function isString(value: any): boolean {
    return typeof value === 'string';
}
