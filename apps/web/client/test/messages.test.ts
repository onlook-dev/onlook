import { describe, expect, test } from 'bun:test';
import { readdir } from 'fs/promises';
import path from 'path';

// Path to locales directory
const LOCALES_DIR = path.join(import.meta.dir, '../messages');

// Helper function to get all translation files
async function getTranslationFiles() {
    const locales = await readdir(LOCALES_DIR);
    const translationFiles: { locale: string; path: string }[] = [];

    for (const locale of locales) {
        const localePath = path.join(LOCALES_DIR, locale);
        const stats = await Bun.file(localePath).stat();

        if (stats.isFile() && locale.endsWith('.json')) {
            translationFiles.push({ locale: locale.replace('.json', ''), path: localePath });
        }
    }

    return translationFiles;
}

// Helper function to read and parse a JSON file
async function readJsonFile(filePath: string) {
    const file = Bun.file(filePath);
    const content = await file.text();
    return JSON.parse(content);
}

// Helper function to get all keys from an object (recursively)
function getAllKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = [];

    for (const key in obj) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            // Recursively get keys for nested objects
            keys = [...keys, ...getAllKeys(obj[key], newPrefix)];
        } else {
            keys.push(newPrefix);
        }
    }

    return keys;
}

// Helper function to check if a key exists in an object
function hasKey(obj: any, keyPath: string): boolean {
    const parts = keyPath.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === undefined || current === null || typeof current !== 'object') {
            return false;
        }

        current = current[part];
    }

    return current !== undefined;
}

// Helper function to get value at a specific key path
function getValueAtPath(obj: any, keyPath: string): any {
    const parts = keyPath.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === undefined || current === null || typeof current !== 'object') {
            return undefined;
        }

        current = current[part];
    }

    return current;
}

describe('Localization Files', () => {
    test('all locales should have translation files', async () => {
        const translationFiles = await getTranslationFiles();
        expect(translationFiles.length).toBeGreaterThan(0);

        // Log the found locales for debugging
        console.log('Found locales:', translationFiles.map((f) => f.locale).join(', '));
    });

    test('all translation files should have the same keys', async () => {
        const translationFiles = await getTranslationFiles();
        expect(translationFiles.length).toBeGreaterThan(0);

        // Use English as the reference
        const referenceLocale = translationFiles.find((f) => f.locale === 'en');
        expect(referenceLocale).toBeDefined();

        if (!referenceLocale) {
            throw new Error('Reference locale (en) not found');
        }

        const referenceJson = await readJsonFile(referenceLocale.path);
        const referenceKeys = getAllKeys(referenceJson).sort();

        // Check each locale against the reference
        for (const file of translationFiles) {
            if (file.locale === 'en') {
                continue;
            } // Skip the reference locale

            const json = await readJsonFile(file.path);
            const keys = getAllKeys(json).sort();

            // Check if all reference keys exist in this locale
            const missingKeys = referenceKeys.filter((key) => !hasKey(json, key));

            if (missingKeys.length > 0) {
                console.error(`Locale ${file.locale} is missing keys:`, missingKeys);
            }

            expect(missingKeys.length).toBe(0);
            if (missingKeys.length > 0) {
                console.error(
                    `Locale ${file.locale} is missing ${missingKeys.length} keys: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`,
                );
            }

            // Check if this locale has extra keys not in the reference
            const extraKeys = keys.filter((key) => !hasKey(referenceJson, key));

            if (extraKeys.length > 0) {
                console.error(`Locale ${file.locale} has extra keys:`, extraKeys);
            }

            expect(extraKeys.length).toBe(0);
            if (extraKeys.length > 0) {
                console.error(
                    `Locale ${file.locale} has ${extraKeys.length} extra keys: ${extraKeys.slice(0, 5).join(', ')}${extraKeys.length > 5 ? '...' : ''}`,
                );
            }
        }
    });

    test('all translation files should have the same structure (value types)', async () => {
        const translationFiles = await getTranslationFiles();

        // Use English as the reference
        const referenceLocale = translationFiles.find((f) => f.locale === 'en');
        expect(referenceLocale).toBeDefined();

        if (!referenceLocale) {
            throw new Error('Reference locale (en) not found');
        }

        const referenceJson = await readJsonFile(referenceLocale.path);
        const referenceKeys = getAllKeys(referenceJson);

        // Check each locale against the reference
        for (const file of translationFiles) {
            if (file.locale === 'en') {
                continue;
            } // Skip the reference locale

            const json = await readJsonFile(file.path);

            // Check if all values have the same type
            const typeMismatches: { key: string; refType: string; actualType: string }[] = [];

            for (const key of referenceKeys) {
                const refValue = getValueAtPath(referenceJson, key);
                const actualValue = getValueAtPath(json, key);

                if (actualValue === undefined) {
                    continue;
                } // Already checked in the previous test

                const refType = Array.isArray(refValue) ? 'array' : typeof refValue;
                const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;

                if (refType !== actualType) {
                    typeMismatches.push({
                        key,
                        refType,
                        actualType,
                    });
                }
            }

            if (typeMismatches.length > 0) {
                console.error(`Locale ${file.locale} has type mismatches:`, typeMismatches);
            }

            expect(typeMismatches.length).toBe(0);
            if (typeMismatches.length > 0) {
                console.error(
                    `Locale ${file.locale} has ${typeMismatches.length} type mismatches: ${typeMismatches
                        .slice(0, 3)
                        .map((m) => `${m.key} (expected ${m.refType}, got ${m.actualType})`)
                        .join(', ')}${typeMismatches.length > 3 ? '...' : ''}`,
                );
            }
        }
    });

    test('all translation files should have valid interpolation placeholders', async () => {
        const translationFiles = await getTranslationFiles();

        // Use English as the reference
        const referenceLocale = translationFiles.find((f) => f.locale === 'en');
        expect(referenceLocale).toBeDefined();

        if (!referenceLocale) {
            throw new Error('Reference locale (en) not found');
        }

        const referenceJson = await readJsonFile(referenceLocale.path);
        const referenceKeys = getAllKeys(referenceJson);

        // Find all string values with interpolation placeholders like {{name}}
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        const keysWithPlaceholders = new Map<string, Set<string>>();

        for (const key of referenceKeys) {
            const value = getValueAtPath(referenceJson, key);

            if (typeof value === 'string') {
                const matches = [...value.matchAll(placeholderRegex)];

                if (matches.length > 0) {
                    const placeholders = new Set(matches.map((m) => m[1]));
                    keysWithPlaceholders.set(key, placeholders);
                }
            }
        }

        // Check each locale for matching placeholders
        for (const file of translationFiles) {
            if (file.locale === 'en') {
                continue;
            } // Skip the reference locale

            const json = await readJsonFile(file.path);
            const placeholderMismatches: { key: string; missing: string[]; extra: string[] }[] = [];

            for (const [key, refPlaceholders] of keysWithPlaceholders.entries()) {
                const value = getValueAtPath(json, key);

                if (typeof value !== 'string') {
                    continue;
                } // Already checked in previous tests

                const matches = [...value.matchAll(placeholderRegex)];
                const actualPlaceholders = new Set(matches.map((m) => m[1]));

                const missing = [...refPlaceholders].filter((p) => !actualPlaceholders.has(p));
                const extra = [...actualPlaceholders].filter((p) => !refPlaceholders.has(p));

                if (missing.length > 0 || extra.length > 0) {
                    placeholderMismatches.push({ key, missing, extra });
                }
            }

            if (placeholderMismatches.length > 0) {
                console.error(
                    `Locale ${file.locale} has placeholder mismatches:`,
                    placeholderMismatches,
                );
            }

            expect(placeholderMismatches.length).toBe(0);
            if (placeholderMismatches.length > 0) {
                console.error(
                    `Locale ${file.locale} has ${placeholderMismatches.length} placeholder mismatches: ${placeholderMismatches
                        .slice(0, 3)
                        .map(
                            (m) =>
                                `${m.key} (missing: ${m.missing.join(', ')}, extra: ${m.extra.join(', ')})`,
                        )
                        .join('; ')}${placeholderMismatches.length > 3 ? '...' : ''}`,
                );
            }
        }
    });
});
