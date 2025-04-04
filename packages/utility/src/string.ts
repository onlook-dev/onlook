export function isEmptyString(str: string): boolean {
    return str.trim() === '';
}

export function isString(value: any): boolean {
    return typeof value === 'string';
}

export function toNormalCase(str: string): string {
    if (!str) {
        return '';
    }

    // Handle already normal case strings (words separated by spaces, first letter of each word capitalized)
    if (/^[A-Z][a-z]*( [A-Z][a-z]*)*$/.test(str)) {
        return str;
    }

    // Skip if the string is fully uppercase
    if (str === str.toUpperCase()) {
        return str;
    }

    // For other cases, convert camelCase/PascalCase to normal case

    return str
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());
}

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
