import { camelCase } from 'lodash';

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

/**
 * Generates a unique name by appending a number to the base name until it doesn't conflict with existing names.
 * The comparison is done using camelCase to ensure consistent name formatting.
 * @param baseName The base name to start with
 * @param existingNames Array of existing names to check against
 * @param transformFn Optional function to transform the name before comparison (defaults to camelCase)
 * @returns A unique name that doesn't conflict with existing names
 */
export function generateUniqueName(
    baseName: string,
    existingNames: string[],
    transformFn: (str: string) => string = camelCase,
): string {
    let counter = 1;
    let newName = `${baseName} ${counter}`;
    let transformedName = transformFn(newName);

    while (existingNames.includes(transformedName)) {
        counter++;
        newName = `${baseName} ${counter}`;
        transformedName = transformFn(newName);
    }

    return newName;
}

/**
 * Sanitizes a filename by normalizing unicode characters and removing unsafe characters.
 * This prevents issues with filenames containing unicode characters like non-breaking spaces
 * that can cause encoding problems further downstream.
 * 
 * @param filename The filename to sanitize
 * @returns A sanitized filename with unicode characters normalized
 */
export function sanitizeFilename(filename: string): string {
    if (!filename) {
        return '';
    }

    return filename
        // Normalize unicode characters (e.g., \u202F non-breaking space -> regular space)
        .normalize('NFC')
        // Replace non-breaking spaces with regular spaces
        .replace(/\u00A0|\u2007|\u202F/g, ' ')
        // Replace other unicode whitespace characters with regular spaces
        .replace(/[\u2000-\u200B\u2028-\u2029]/g, ' ')
        // Collapse multiple spaces into single spaces
        .replace(/\s+/g, ' ')
        // Trim whitespace from start and end
        .trim();
}
