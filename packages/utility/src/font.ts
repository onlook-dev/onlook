/**
 * Extracts the actual font name from a font file name
 * Removes file extensions, weight/style indicators, and other common suffixes
 */
function extractFontName(fileName: string): string {
    // Remove file extension
    let name = fileName.replace(/\.[^/.]+$/, '');

    // Common weight terms that might appear in font names
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
        'lightitalic',
        'light italic',
        'bolditalic',
        'bold italic',
        'mediumitalic',
        'medium italic',
        'blackitalic',
        'black italic',
        'extralightitalic',
        'extrabolditalic',
    ];

    // Common style terms
    const styleTerms = ['italic', 'oblique', 'slanted', 'kursiv', 'mediumitalic', 'medium italic'];

    // Create a regex pattern for all weight and style terms
    const allTerms = [...new Set([...weightTerms, ...styleTerms])].map((term) =>
        term.replace(/\s+/g, '\\s+'),
    );
    const termPattern = new RegExp(`[-_\\s]+(${allTerms.join('|')})(?:[-_\\s]+|$)`, 'gi');

    // Remove weight and style terms
    name = name.replace(termPattern, '');

    // Remove numeric weights (100, 200, 300, etc.)
    name = name.replace(/[-_\\s]+\d+(?:wt|weight)?(?:[-_\\s]+|$)/gi, '');
    name = name.replace(/\s*\d+\s*$/g, '');

    // Remove any trailing hyphens, underscores, or spaces
    name = name.replace(/[-_\s]+$/g, '');

    // Replace hyphens and underscores with spaces
    name = name.replace(/[-_]+/g, ' ');

    // Handle camelCase conversion
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Capitalize each word
    name = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return name.trim();
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

    return `${baseName}${weightName}${styleName}`;
}

export { extractFontName, getFontFileName };
