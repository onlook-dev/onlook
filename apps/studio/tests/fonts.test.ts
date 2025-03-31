import { extractFontName, getFontFileName } from '@onlook/utility';

describe('Font Utilities', () => {
    describe('extractFontName', () => {
        it('should extract clean font names from various file formats', () => {
            expect(extractFontName('Roboto.ttf')).toBe('Roboto');
            expect(extractFontName('OpenSans.woff2')).toBe('Open Sans');
            expect(extractFontName('Montserrat-Regular.otf')).toBe('Montserrat');
        });

        it('should handle weight indicators', () => {
            expect(extractFontName('Roboto-Bold.ttf')).toBe('Roboto');
            expect(extractFontName('OpenSans-ExtraLight.woff2')).toBe('Open Sans');
            expect(extractFontName('Montserrat-BlackItalic.otf')).toBe('Montserrat');
        });

        it('should handle numeric weights', () => {
            expect(extractFontName('Roboto-700.ttf')).toBe('Roboto');
            expect(extractFontName('OpenSans-300wt.woff2')).toBe('Open Sans');
            expect(extractFontName('Montserrat-400weight.otf')).toBe('Montserrat');
        });

        it('should handle style indicators', () => {
            expect(extractFontName('Roboto-Italic.ttf')).toBe('Roboto');
            expect(extractFontName('OpenSans-Oblique.woff2')).toBe('Open Sans');
            expect(extractFontName('Montserrat-Slanted.otf')).toBe('Montserrat');
        });

        it('should handle complex combinations', () => {
            expect(extractFontName('Roboto-BoldItalic-700.ttf')).toBe('Roboto');
            expect(extractFontName('OpenSans-ExtraLightOblique-200.woff2')).toBe('Open Sans');
            expect(extractFontName('Montserrat-BlackItalic-900weight.otf')).toBe('Montserrat');
        });

        it('should handle various separators', () => {
            expect(extractFontName('Roboto_Bold.ttf')).toBe('Roboto');
            expect(extractFontName('Open Sans Extra Light.woff2')).toBe('Open Sans Extra Light');
            expect(extractFontName('Montserrat-Black_Italic.otf')).toBe('Montserrat');
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
});
