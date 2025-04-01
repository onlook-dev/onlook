import * as fs from 'fs';
import * as t from '@babel/types';
import { parse, type ParseResult } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as pathModule from 'path';
import { readFile, writeFile } from '../../code/files';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';
import { detectRouterType } from '../../pages/helpers';
import {
    createStringLiteralWithFont,
    createTemplateLiteralWithFont,
    findFontClass,
    removeFontsFromClassName,
} from './utils';
import type { TraverseCallback } from './types';

/**
 * Traverses JSX elements in a file to find and modify className attributes
 * Used for adding or removing font variables from layout files
 */
export async function traverseClassName(
    filePath: string,
    targetElements: string[],
    callback: TraverseCallback,
): Promise<void> {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        const content = await readFile(filePath);
        if (!content) {
            return;
        }

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        traverse(ast, {
            JSXOpeningElement(path) {
                if (
                    !t.isJSXIdentifier(path.node.name) ||
                    !targetElements.includes(path.node.name.name)
                ) {
                    return;
                }

                const classNameAttr = path.node.attributes.find(
                    (attr): attr is t.JSXAttribute =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'className',
                );

                if (!classNameAttr) {
                    const newClassNameAttr = t.jsxAttribute(
                        t.jsxIdentifier('className'),
                        t.stringLiteral(''),
                    );
                    path.node.attributes.push(newClassNameAttr);
                    callback(newClassNameAttr, ast);
                    return;
                }
                callback(classNameAttr, ast);
            },
        });
    } catch (error) {
        console.error(`Error traversing className in ${filePath}:`, error);
    }
}

/**
 * Updates a file's imports to include the new font import if needed
 */
async function updateFileWithImport(
    filePath: string,
    content: string,
    ast: ParseResult<t.File>,
    fontName: string,
): Promise<void> {
    const { code } = generate(ast);
    const fontPath = '@/' + DefaultSettings.FONT_CONFIG.replace(/^\.\//, '').replace(/\.ts$/, '');
    const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"]${fontPath}['"]`);
    const importMatch = content.match(importRegex);

    let newContent = code;

    if (importMatch) {
        const currentImports = importMatch[1];
        if (!currentImports.includes(fontName)) {
            const newImports = currentImports.trim() + `, ${fontName}`;
            newContent = newContent.replace(
                importRegex,
                `import { ${newImports} } from '${fontPath}'`,
            );
        }
    } else {
        const fontImport = `import { ${fontName} } from '${fontPath}';`;
        newContent = fontImport + '\n' + newContent;
    }

    fs.writeFileSync(filePath, newContent);
}

/**
 * Adds a font variable to specified target elements in a file
 * Updates the className attribute to include the font variable
 */
export async function addFontVariableToElement(
    filePath: string,
    fontName: string,
    targetElements: string[],
): Promise<void> {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        const content = await readFile(filePath);
        if (!content) {
            return;
        }

        let updatedAst = false;
        let targetElementFound = false;

        await traverseClassName(filePath, targetElements, async (classNameAttr, ast) => {
            targetElementFound = true;
            const fontVarExpr = t.memberExpression(
                t.identifier(fontName),
                t.identifier('variable'),
            );

            if (t.isStringLiteral(classNameAttr.value)) {
                if (classNameAttr.value.value === '') {
                    const quasis = [
                        t.templateElement({ raw: '', cooked: '' }, false),
                        t.templateElement({ raw: '', cooked: '' }, true),
                    ];
                    classNameAttr.value = t.jsxExpressionContainer(
                        t.templateLiteral(quasis, [fontVarExpr]),
                    );
                } else {
                    classNameAttr.value = t.jsxExpressionContainer(
                        createTemplateLiteralWithFont(
                            fontVarExpr,
                            t.stringLiteral(classNameAttr.value.value),
                        ),
                    );
                }
                updatedAst = true;
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;

                if (t.isTemplateLiteral(expr)) {
                    const hasFont = expr.expressions.some(
                        (e) =>
                            t.isMemberExpression(e) &&
                            t.isIdentifier(e.object) &&
                            e.object.name === fontName &&
                            t.isIdentifier(e.property) &&
                            e.property.name === 'variable',
                    );

                    if (!hasFont) {
                        if (expr.expressions.length > 0) {
                            const lastQuasi = expr.quasis[expr.quasis.length - 1];
                            if (lastQuasi) {
                                lastQuasi.value.raw = lastQuasi.value.raw + ' ';
                                lastQuasi.value.cooked = lastQuasi.value.cooked + ' ';
                            }
                        }
                        expr.expressions.push(fontVarExpr);
                        if (expr.quasis.length <= expr.expressions.length) {
                            expr.quasis.push(t.templateElement({ raw: '', cooked: '' }, true));
                        }
                        updatedAst = true;
                    }
                } else if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
                    classNameAttr.value = t.jsxExpressionContainer(
                        createTemplateLiteralWithFont(fontVarExpr, expr),
                    );
                    updatedAst = true;
                }
            }

            if (updatedAst) {
                await updateFileWithImport(filePath, content, ast, fontName);
            }
        });

        if (!targetElementFound) {
            console.log(
                `Could not find target elements (${targetElements.join(', ')}) in ${filePath}`,
            );
        }
    } catch (error) {
        console.error(`Error adding font variable to ${filePath}:`, error);
    }
}

export async function addFontVariableToLayout(projectRoot: string, fontName: string) {
    const routerConfig = await detectRouterType(projectRoot);
    if (routerConfig) {
        if (routerConfig.type === 'app') {
            const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
            await addFontVariableToElement(layoutPath, fontName, ['html']);
        } else {
            const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
            await addFontVariableToElement(appPath, fontName, ['div', 'main', 'section', 'body']);
        }
    }
}

/**
 * Removes a font variable from specified target elements in a layout file
 * Cleans up the className attribute and removes the font import if no longer needed
 */
export async function removeFontVariableFromLayout(
    filePath: string,
    fontId: string,
    targetElements: string[],
): Promise<void> {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        const content = await readFile(filePath);
        if (!content) {
            return;
        }

        let updatedAst = false;
        let ast: ParseResult<t.File> | null = null;

        await traverseClassName(filePath, targetElements, async (classNameAttr, currentAst) => {
            ast = currentAst;
            if (removeFontsFromClassName(classNameAttr, { fontIds: [fontId] })) {
                updatedAst = true;
            }
        });

        if (updatedAst && ast) {
            // Remove the font import if it exists
            const fontPath =
                '@/' + DefaultSettings.FONT_CONFIG.replace(/^\.\//, '').replace(/\.ts$/, '');
            const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"]${fontPath}['"]`);
            const importMatch = content.match(importRegex);

            let newContent = generate(ast).code;

            if (importMatch) {
                const currentImports = importMatch[1];
                const newImports = currentImports
                    .split(',')
                    .map((imp) => imp.trim())
                    .filter((imp) => {
                        const importName = imp.split(' as ')[0].trim();
                        return importName !== fontId;
                    })
                    .join(', ');

                if (newImports) {
                    newContent = newContent.replace(
                        importRegex,
                        `import { ${newImports} } from '${fontPath}'`,
                    );
                } else {
                    newContent = newContent.replace(new RegExp(`${importRegex.source}\\n?`), '');
                }
            }

            fs.writeFileSync(filePath, newContent);
        }
    } catch (error) {
        console.error(`Error removing font variable from ${filePath}:`, error);
    }
}

/**
 * Updates the font in a layout file by modifying className attributes
 * Handles both string literals and template literals in className
 */
export async function updateFontInLayout(
    filePath: string,
    font: Font,
    targetElements: string[],
): Promise<void> {
    let updatedAst = false;
    const fontClassName = `font-${font.id}`;
    let result = null;

    await traverseClassName(filePath, targetElements, (classNameAttr, ast) => {
        if (t.isStringLiteral(classNameAttr.value)) {
            classNameAttr.value = createStringLiteralWithFont(
                fontClassName,
                classNameAttr.value.value,
            );
            updatedAst = true;
        } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
            const expr = classNameAttr.value.expression;
            if (t.isTemplateLiteral(expr)) {
                const newQuasis = [
                    t.templateElement(
                        { raw: fontClassName + ' ', cooked: fontClassName + ' ' },
                        false,
                    ),
                    ...expr.quasis.slice(1),
                ];

                expr.quasis = newQuasis;
                updatedAst = true;
            }
        }
        if (updatedAst) {
            const { code } = generate(ast);
            result = code;
        }
    });

    if (result) {
        fs.writeFileSync(filePath, result);
    }
}

/**
 * Detects the current font being used in a layout file
 * Extracts font information from className attributes
 */
export async function detectCurrentFont(
    filePath: string,
    targetElements: string[],
): Promise<string | null> {
    let currentFont: string | null = null;

    await traverseClassName(filePath, targetElements, (classNameAttr) => {
        if (t.isStringLiteral(classNameAttr.value)) {
            currentFont = findFontClass(classNameAttr.value.value);
        } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
            const expr = classNameAttr.value.expression;
            if (t.isTemplateLiteral(expr)) {
                const firstQuasi = expr.quasis[0];
                if (firstQuasi) {
                    currentFont = findFontClass(firstQuasi.value.raw);
                }
            }
        }
    });

    return currentFont;
}

/**
 * Gets the current default font from the project's layout file
 * Handles both App Router and Pages Router configurations
 */
export async function getDefaultFont(projectRoot: string): Promise<string | null> {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return null;
        }

        if (routerConfig.type === 'app') {
            const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
            return await detectCurrentFont(layoutPath, ['html']);
        } else {
            const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
            return await detectCurrentFont(appPath, ['div', 'main', 'section', 'body']);
        }
    } catch (error) {
        console.error('Error getting current font:', error);
        return null;
    }
}

/**
 * Sets the default font for the project by updating the appropriate layout file
 * Handles both App Router and Pages Router configurations
 */
export async function setDefaultFont(projectRoot: string, font: Font) {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return;
        }

        if (routerConfig.type === 'app') {
            const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
            await updateFontInLayout(layoutPath, font, ['html']);
        } else {
            const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
            await updateFontInLayout(appPath, font, ['div', 'main', 'section', 'body']);
        }
    } catch (error) {
        console.error('Error setting default font:', error);
    }
}
