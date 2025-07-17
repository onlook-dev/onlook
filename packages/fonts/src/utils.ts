import { type Font, type RawFont, RouterType } from '@onlook/models';

/**
 * Converts a RawFont to a Font
 */
export function convertRawFont(font: RawFont): Font {
    return {
        ...font,
        weight: font.weights,
        styles: font.styles || [],
        variable: `--font-${font.id}`,
    };
}

/**
 * Gets target elements based on router type
 */
export function getFontRootElements(type: RouterType): string[] {
    if (type === RouterType.APP) return ['html', 'body'];
    return ['div', 'main', 'section', 'body'];
}

/**
 * Cleans up comma-separated strings by removing extra commas and spaces
 */
export function cleanComma(str: string): string {
    return str
        .replace(/,\s*,+/g, ',') // Replace multiple commas with single comma
        .replace(/^\s*,+\s*|\s*,+\s*$/g, '') // Remove leading/trailing commas
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim();
}
