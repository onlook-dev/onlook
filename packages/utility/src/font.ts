/**
 * Extracts the actual font name from a font file name
 * Removes file extensions, weight/style indicators, and other common suffixes
 */
function extractFontName(fileName: string): string {
    // Remove file extension
    let name = fileName.replace(/\.[^/.]+$/, '');

    // Define common font weight and style terms
    const weightTerms = [
        'thin',
        'hairline',
        'extralight',
        'extra light',
        'ultralight',
        'ultra light',
        'light',
        'regular',
        'normal',
        'book',
        'medium',
        'semibold',
        'semi bold',
        'demibold',
        'demi bold',
        'bold',
        'extrabold',
        'extra bold',
        'ultrabold',
        'ultra bold',
        'black',
        'heavy',
        'extrablack',
        'extra black',
        'ultrablack',
        'ultra black',
    ];

    const styleTerms = ['italic', 'oblique', 'slanted', 'kursiv'];

    // Special case: If the name contains spaces without hyphens or underscores, return as title case
    if (/\s/.test(name) && !/[-_]/.test(name)) {
        return toTitleCase(name);
    }

    const parts = name.split(/[-_\s]+/);

    // Filter out weight terms, style terms, and numeric weights
    const filteredParts = parts.filter((part) => {
        const lowerPart = part.toLowerCase();
        // Check if part is a weight term or style term
        if (weightTerms.includes(lowerPart) || styleTerms.includes(lowerPart)) {
            return false;
        }

        // Check for combined terms like "BoldItalic"
        for (const weightTerm of weightTerms) {
            for (const styleTerm of styleTerms) {
                const combined = weightTerm + styleTerm;
                if (lowerPart === combined) {
                    return false;
                }
            }
        }

        // Check for numeric weights (e.g., 100, 300, 700)
        if (/^\d+(?:wt|weight)?$/.test(part)) {
            return false;
        }

        return true;
    });

    // Join the filtered parts with spaces
    name = filteredParts.join(' ');

    // Handle camelCase in the final name
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

    return toTitleCase(name.trim());
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

export { extractFontName, getFontFileName };
