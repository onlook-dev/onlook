import type { Font } from '@onlook/models';
import { types as t, type t as T } from '@onlook/parser';
import { camelCase } from 'lodash';

/**
 * Creates an AST object expression containing font configuration properties for Google Fonts.
 * Generates the configuration object with subsets, weights, styles, CSS variable name, and display strategy.
 *
 * @param font - The font object containing metadata like subsets, weights, styles, and variable name
 * @returns AST object expression with font configuration properties (subsets, weight, style, variable, display)
 *
 * @example
 * // Input font: { subsets: ['latin'], weight: ['400', '700'], styles: ['normal'], variable: '--font-inter' }
 * // Generated output:
 * {
 *   subsets: ['latin'],
 *   weight: ['400', '700'],
 *   style: ['normal'],
 *   variable: '--font-inter',
 *   display: 'swap'
 * }
 */
export function createFontConfigAst(font: Font): T.ObjectExpression {
    return t.objectExpression([
        t.objectProperty(
            t.identifier('subsets'),
            t.arrayExpression(font.subsets.map((s) => t.stringLiteral(s))),
        ),
        t.objectProperty(
            t.identifier('weight'),
            t.arrayExpression((font.weight ?? []).map((w) => t.stringLiteral(w))),
        ),
        t.objectProperty(
            t.identifier('style'),
            t.arrayExpression((font.styles ?? []).map((s) => t.stringLiteral(s))),
        ),
        t.objectProperty(t.identifier('variable'), t.stringLiteral(font.variable)),
        t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
    ]);
}

/**
 * Creates an AST object property for Tailwind CSS fontFamily configuration.
 * Generates a fontFamily property with the font ID as key and an array containing
 * the CSS variable reference and a fallback font.
 *
 * @param font - The font object containing the ID and variable name
 * @returns AST object property for fontFamily configuration with CSS variable and fallback
 *
 * @example
 * // Input font: { id: 'inter', variable: '--font-inter' }
 * // Generated output:
 * fontFamily: {
 *   inter: ['var(--font-inter)', 'sans-serif']
 * }
 */
export function createFontFamilyProperty(font: Font): T.ObjectProperty {
    return t.objectProperty(
        t.identifier('fontFamily'),
        t.objectExpression([
            t.objectProperty(
                t.identifier(font.id),
                t.arrayExpression([
                    t.stringLiteral(`var(${font.variable})`),
                    t.stringLiteral('sans-serif'),
                ]),
            ),
        ]),
    );
}

/**
 * Creates a complete export declaration for a Google Font variable.
 * Generates a camelCase variable name, creates the font configuration object,
 * and wraps it in a const declaration with export statement.
 *
 * @param font - The font object containing family name, ID, and configuration
 * @returns AST export declaration with const variable assignment for the font
 *
 * @example
 * // Input font: { id: 'inter-tight', family: 'Inter Tight', subsets: ['latin'], weight: ['400'], variable: '--font-inter-tight' }
 * // Generated output:
 * export const interTight = Inter_Tight({
 *   subsets: ['latin'],
 *   weight: ['400'],
 *   style: [],
 *   variable: '--font-inter-tight',
 *   display: 'swap'
 * });
 */
export function generateFontVariableExport(font: Font): T.ExportNamedDeclaration {
    const fontName = camelCase(font.id);
    const importName = font.family.replace(/\s+/g, '_');
    // Create the AST nodes for the new font
    const fontConfigObject = createFontConfigAst(font);

    const fontDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
            t.identifier(fontName),
            t.callExpression(t.identifier(importName), [fontConfigObject]),
        ),
    ]);

    const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

    return exportDeclaration;
}

/**
 * Creates and adds a local font configuration to an existing AST.
 * Generates a complete local font setup with source files, CSS variable, display strategy,
 * fallback fonts, and preload option. Modifies the AST by appending the export declaration.
 *
 * @param ast - The existing AST file to modify
 * @param fontName - The name for the font variable (will be converted to kebab-case for CSS variable)
 * @param fontsSrc - Array of font source objects containing file paths and formats
 * @returns Modified AST file with the new local font export declaration added
 *
 * @example
 * // Input: fontName = 'customFont', fontsSrc = [{ src: './fonts/custom.woff2', format: 'woff2' }]
 * // Generated output added to AST:
 * export const customFont = localFont({
 *   src: [{ src: './fonts/custom.woff2', format: 'woff2' }],
 *   variable: '--font-custom-font',
 *   display: 'swap',
 *   fallback: ['system-ui', 'sans-serif'],
 *   preload: true
 * });
 */
export function createLocalFontConfig(
    ast: T.File,
    fontName: string,
    fontsSrc: T.ObjectExpression[],
): T.File {
    // Create a new font configuration
    const fontConfigObject = t.objectExpression([
        t.objectProperty(t.identifier('src'), t.arrayExpression(fontsSrc)),
        t.objectProperty(
            t.identifier('variable'),
            t.stringLiteral(`--font-${fontName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`),
        ),
        t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
        t.objectProperty(
            t.identifier('fallback'),
            t.arrayExpression([t.stringLiteral('system-ui'), t.stringLiteral('sans-serif')]),
        ),
        t.objectProperty(t.identifier('preload'), t.booleanLiteral(true)),
    ]);

    const fontDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
            t.identifier(fontName),
            t.callExpression(t.identifier('localFont'), [fontConfigObject]),
        ),
    ]);

    const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

    ast.program.body.push(exportDeclaration);
    return ast;
}
