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

    // For other cases, convert camelCase/PascalCase to normal case
    return str
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());
}
export function toCamelCase(str: string): string {
    if (!str) {
        return '';
    }

    if (/^[a-z][a-zA-Z0-9]*$/.test(str)) {
        return str;
    }

    if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    const words = str.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (!words.length) {
        return '';
    }

    // Convert first word to lowercase and capitalize subsequent words
    return (
        words[0].toLowerCase() +
        words
            .slice(1)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')
    );
}
