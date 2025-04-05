import { extractFontParts, getFontFileName, convertFontString } from '@onlook/utility';

describe('Font Utilities', () => {
    describe('extractFontParts', () => {
        it('should extract font parts from various file formats', () => {
            expect(extractFontParts('Roboto.ttf')).toEqual({
                family: 'Roboto',
                weight: '400',
                style: 'normal',
            });
            expect(extractFontParts('OpenSans.woff2')).toEqual({
                family: 'Open Sans',
                weight: '400',
                style: 'normal',
            });
            expect(extractFontParts('Montserrat-Regular.otf')).toEqual({
                family: 'Montserrat',
                weight: '400',
                style: 'normal',
            });
        });

        it('should handle weight indicators', () => {
            expect(extractFontParts('Roboto-Bold.ttf')).toEqual({
                family: 'Roboto',
                weight: '700',
                style: 'normal',
            });
            expect(extractFontParts('OpenSans-ExtraLight.woff2')).toEqual({
                family: 'Open Sans',
                weight: '200',
                style: 'normal',
            });
            expect(extractFontParts('Montserrat-BlackItalic.otf')).toEqual({
                family: 'Montserrat',
                weight: '900',
                style: 'italic',
            });
        });

        it('should handle numeric weights', () => {
            expect(extractFontParts('Roboto-700.ttf')).toEqual({
                family: 'Roboto',
                weight: '700',
                style: 'normal',
            });
            expect(extractFontParts('OpenSans-300wt.woff2')).toEqual({
                family: 'Open Sans',
                weight: '300',
                style: 'normal',
            });
            expect(extractFontParts('Montserrat-400weight.otf')).toEqual({
                family: 'Montserrat',
                weight: '400',
                style: 'normal',
            });
        });

        it('should handle style indicators', () => {
            expect(extractFontParts('Roboto-Italic.ttf')).toEqual({
                family: 'Roboto',
                weight: '400',
                style: 'italic',
            });
            expect(extractFontParts('OpenSans-Oblique.woff2')).toEqual({
                family: 'Open Sans',
                weight: '400',
                style: 'oblique',
            });
            expect(extractFontParts('Montserrat-Slanted.otf')).toEqual({
                family: 'Montserrat',
                weight: '400',
                style: 'slanted',
            });
        });

        it('should handle complex combinations', () => {
            expect(extractFontParts('Roboto-BoldItalic-700.ttf')).toEqual({
                family: 'Roboto',
                weight: '700',
                style: 'italic',
            });
            expect(extractFontParts('OpenSans-ExtraLightOblique-200.woff2')).toEqual({
                family: 'Open Sans',
                weight: '200',
                style: 'oblique',
            });
            expect(extractFontParts('Montserrat-BlackItalic-900weight.otf')).toEqual({
                family: 'Montserrat',
                weight: '900',
                style: 'italic',
            });
        });

        it('should handle various separators', () => {
            expect(extractFontParts('Roboto_Bold.ttf')).toEqual({
                family: 'Roboto',
                weight: '700',
                style: 'normal',
            });
            expect(extractFontParts('Open Sans Extra Light.woff2')).toEqual({
                family: 'Open Sans Extra Light',
                weight: '',
                style: '',
            });
            expect(extractFontParts('Montserrat-Black_Italic.otf')).toEqual({
                family: 'Montserrat',
                weight: '900',
                style: 'italic',
            });
        });
    });

    describe('getFontFileName', () => {
        it('should generate correct filenames for regular weights', () => {
            expect(getFontFileName('Roboto', '400', 'normal')).toBe('RobotoRegular');
            expect(getFontFileName('OpenSans', '400', 'normal')).toBe('OpenSansRegular');
        });

        it('should handle different weights', () => {
            expect(getFontFileName('Roboto', '700', 'normal')).toBe('RobotoBold');
            expect(getFontFileName('OpenSans', '300', 'normal')).toBe('OpenSansLight');
            expect(getFontFileName('Montserrat', '900', 'normal')).toBe('MontserratBlack');
        });

        it('should handle italic styles', () => {
            expect(getFontFileName('Roboto', '400', 'italic')).toBe('RobotoRegularItalic');
            expect(getFontFileName('OpenSans', '700', 'italic')).toBe('OpenSansBoldItalic');
        });

        it('should handle combinations of weights and styles', () => {
            expect(getFontFileName('Roboto', '700', 'italic')).toBe('RobotoBoldItalic');
            expect(getFontFileName('OpenSans', '300', 'italic')).toBe('OpenSansLightItalic');
            expect(getFontFileName('Montserrat', '900', 'italic')).toBe('MontserratBlackItalic');
        });

        it('should handle unknown weights', () => {
            expect(getFontFileName('Roboto', '450', 'normal')).toBe('Roboto450');
            expect(getFontFileName('OpenSans', '550', 'italic')).toBe('OpenSans550Italic');
        });
    });

    describe('convertFontString', () => {
        it('should handle empty string', () => {
            expect(convertFontString('')).toBe('');
        });

        it('should convert basic font strings', () => {
            expect(convertFontString('__Advent_Pro_bf3a91')).toBe('adventPro');
            expect(convertFontString('__Open_Sans_1a2b3c')).toBe('openSans');
            expect(convertFontString('__Roboto_Mono_def456')).toBe('robotoMono');
        });

        it('should handle font strings with fallback', () => {
            expect(
                convertFontString('__Advent_Pro_abc123, __Advent_Pro_Fallback_abc123, sans-serif'),
            ).toBe('adventPro');
            expect(
                convertFontString('__Open_Sans_92fcab, __Open_Sans_Fallback_92fcab, system-ui'),
            ).toBe('openSans');
        });

        it('should handle font strings with special characters', () => {
            expect(convertFontString('__Noto_Sans_JP_abc123')).toBe('notoSansJp');
            expect(convertFontString('__Source_Code_Pro_7e4f1a')).toBe('sourceCodePro');
        });
    });
});
