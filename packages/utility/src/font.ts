import { DEFAULT, VARIANTS } from '@onlook/fonts';
import { camelCase } from 'lodash';

/**
 * Extracts the actual font name from a font file name
 * Removes file extensions, weight/style indicators, and other common suffixes
 */

interface FontParts {
    family: string;
    weight: string;
    style: string;
}

function extractFontParts(fileName: string): FontParts {
    // Remove file extension
    let name = fileName.replace(/\.[^/.]+$/, '');

    // Define common font weight and style terms
    const weightTerms = [
        'extra light',
        'ultra light',
        'extra black',
        'ultra black',
        'extralight',
        'ultralight',
        'extra bold',
        'ultra bold',
        'extrablack',
        'ultrablack',
        'semi bold',
        'demi bold',
        'extrabold',
        'ultrabold',
        'hairline',
        'semibold',
        'demibold',
        'regular',
        'medium',
        'normal',
        'light',
        'black',
        'heavy',
        'thin',
        'bold',
        'book',
    ];

    const styleTerms = ['italic', 'oblique', 'slanted', 'kursiv'];

    let family = '';
    let weight = '';
    let style = '';

    // Special case: If the name contains spaces without hyphens or underscores, return as title case
    if (/\s/.test(name) && !/[-_]/.test(name)) {
        family = toTitleCase(name);
        return { family, weight: '', style: '' }; // Exit early for names with spaces but no delimiters
    }

    const parts = name.split(/[-_\s]+/);

    // Filter out weight terms, style terms, and numeric weights
    const filteredParts = parts.filter((part) => {
        const lowerPart = part.toLowerCase();
        // Check if part is a weight term or style term
        if (weightTerms.includes(lowerPart)) {
            weight = lowerPart;
            return false;
        }

        if (styleTerms.includes(lowerPart)) {
            style = lowerPart;
            return false;
        }

        // Check for combined terms like "BoldItalic"
        for (const weightTerm of weightTerms) {
            for (const styleTerm of styleTerms) {
                const combined = weightTerm + styleTerm;
                if (lowerPart === combined) {
                    weight = weightTerm;
                    style = styleTerm;
                    return false;
                }
            }
        }

        // Check for numeric weights (e.g., 100, 300, 700)
        if (/^\d+(?:wt|weight)?$/.test(part)) {
            weight = part.replace(/[^\d]/g, '');
            return false;
        }

        return true;
    });

    if (!family) {
        family = filteredParts.join(' ');
        family = family.replace(/([a-z])([A-Z])/g, '$1 $2');
        family = toTitleCase(family);
    }

    // Convert weight to numeric value
    if (weight) {
        let match = VARIANTS.find((variant) => variant.name.toLowerCase() === weight.toLowerCase());

        if (!match && /^\d+$/.test(weight)) {
            match = VARIANTS.find((variant) => variant.value === weight);
        }

        if (!match) {
            const weightLower = weight.toLowerCase();
            const weightNormalized = weightLower.replace(/\s+/g, '');

            // First try to find exact matches (normalized for spaces)
            match = VARIANTS.find((variant) => {
                const variantLower = variant.name.toLowerCase();
                const variantNormalized = variantLower.replace(/\s+/g, '');

                return weightNormalized === variantNormalized || weightLower === variantLower;
            });

            // If no exact match found, then try partial matches
            if (!match) {
                match = VARIANTS.find((variant) => {
                    const variantLower = variant.name.toLowerCase();

                    return (
                        weightLower.includes(variantLower) &&
                        // Only allow partial matches for single-word variants
                        !variantLower.includes(' ')
                    );
                });
            }
        }

        weight = match?.value || weight;
    }

    if (!style) {
        style = DEFAULT.STYLE;
    }

    if (!weight) {
        weight = DEFAULT.WEIGHT;
    }

    return { family, weight, style };
}

function toTitleCase(str: string): string {
    return str
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Gets a descriptive name for a font file based on its weight and style
 */
function getFontFileName(baseName: string, weight: string, style: string): string {
    const weightMap: Record<string, string> = {
        '100': 'Thin',
        '200': 'ExtraLight',
        '300': 'Light',
        '400': 'Regular',
        '500': 'Medium',
        '600': 'SemiBold',
        '700': 'Bold',
        '800': 'ExtraBold',
        '900': 'Black',
    };

    const weightName = weightMap[weight] || weight;
    const styleName =
        style.toLowerCase() === 'normal' ? '' : style.charAt(0).toUpperCase() + style.slice(1);

    return `${baseName.replace(/\s+/g, '')}${weightName}${styleName}`;
}

/**
 * Converts a font string like "__Advent_Pro_[hash], __Advent_Pro_Fallback_[hash], sans-serif" to "adventPro"
 */
function convertFontString(fontString: string): string {
    if (!fontString) {
        return '';
    }

    const firstFont = fontString.split(',')[0]?.trim();
    const cleanFont = firstFont?.replace(/^__/, '').replace(/_[a-f0-9]+$/, '');
    const withoutFallback = cleanFont?.replace(/_Fallback$/, '');

    return camelCase(withoutFallback);
}

/**
 * Converts a font weight string to a human-readable name
 * @param weight - The weight value to convert
 * @returns The human-readable name of the weight, or the original weight if no match is found
 */

function convertFontWeight(weight: string): string {
    return VARIANTS.find((variant) => variant.value === weight)?.name ?? weight;
}
export { convertFontString, convertFontWeight, extractFontParts, getFontFileName };
