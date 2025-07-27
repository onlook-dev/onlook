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
