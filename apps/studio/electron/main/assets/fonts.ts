import * as fs from 'fs';
import * as pathModule from 'path';
import { parse, type ParseResult } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { readFile } from '../code/files';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';
import { getConfigPath, modifyTailwindConfig } from './helpers';
import { detectRouterType } from '../pages/helpers';
import { camelCase } from 'lodash';

/**
 * Regular expression to match font weight classes in Tailwind CSS
 */
const FONT_WEIGHT_REGEX =
    /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;

/**
 * Extracts the font family class from a className string, excluding font weight classes
 */
function findFontClass(className: string): string | null {
    const fontClass = className
        .split(' ')
        .find((c) => c.startsWith('font-') && !c.match(FONT_WEIGHT_REGEX));
    return fontClass ? fontClass.replace('font-', '') : null;
}

/**
 * Filters out font-related classes from a className string, keeping only font weight classes
 */
function filterFontClasses(className: string): string[] {
    return className.split(' ').filter((c) => !c.startsWith('font-') || c.match(FONT_WEIGHT_REGEX));
}

/**
 * Scans the project's font configuration file to extract all configured fonts
 * Uses AST traversal to parse Next.js font imports and configurations
 */
export async function scanFonts(projectRoot: string): Promise<Font[]> {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        const content = await readFile(fontPath);

        if (!content) {
            return [];
        }

        const fonts: Font[] = [];

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontImports: Record<string, string> = {};

        traverse(ast, {
            // Extract font imports from 'next/font/google'
            ImportDeclaration(path) {
                const source = path.node.source.value;
                if (source === 'next/font/google') {
                    path.node.specifiers.forEach((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            // Map the imported name to itself (for matching constructors later)
                            fontImports[specifier.imported.name] = specifier.imported.name;
                        }
                    });
                }
            },

            // Find font variable declarations
            VariableDeclaration(path) {
                // Only process export declarations
                const parentNode = path.parent;
                if (!t.isExportNamedDeclaration(parentNode)) {
                    return;
                }

                // Process each variable declarator
                path.node.declarations.forEach((declarator) => {
                    if (!t.isIdentifier(declarator.id) || !declarator.init) {
                        return;
                    }

                    const fontId = declarator.id.name;

                    // Check if it's a font constructor call
                    if (t.isCallExpression(declarator.init)) {
                        const callee = declarator.init.callee;

                        // Get the font type (constructor name)
                        let fontType = '';
                        if (t.isIdentifier(callee) && fontImports[callee.name]) {
                            fontType = fontImports[callee.name];
                        }

                        // Get the configuration object
                        const configArg = declarator.init.arguments[0];
                        if (t.isObjectExpression(configArg)) {
                            // Extract configuration properties
                            const fontConfig: Record<string, any> = {
                                id: fontId,
                                family: fontType.replace(/_/g, ' '),
                                type: 'google',
                                subsets: [],
                                weight: [],
                                styles: [],
                                variable: '',
                            };

                            // Process each property in the config object
                            configArg.properties.forEach((prop) => {
                                if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) {
                                    return;
                                }

                                const propName = prop.key.name;

                                if (propName === 'variable' && t.isStringLiteral(prop.value)) {
                                    fontConfig.variable = prop.value.value;
                                }

                                if (propName === 'subsets' && t.isArrayExpression(prop.value)) {
                                    fontConfig.subsets = prop.value.elements
                                        .filter((element): element is t.StringLiteral =>
                                            t.isStringLiteral(element),
                                        )
                                        .map((element) => element.value);
                                }

                                if (
                                    (propName === 'weight' || propName === 'weights') &&
                                    t.isArrayExpression(prop.value)
                                ) {
                                    fontConfig.weight = prop.value.elements
                                        .map((element) => {
                                            if (t.isStringLiteral(element)) {
                                                return element.value;
                                            } else if (t.isNumericLiteral(element)) {
                                                return element.value.toString();
                                            }
                                            return null;
                                        })
                                        .filter(
                                            (weight): weight is string =>
                                                weight !== null && !isNaN(Number(weight)),
                                        );
                                }

                                if (
                                    (propName === 'style' || propName === 'styles') &&
                                    t.isArrayExpression(prop.value)
                                ) {
                                    fontConfig.styles = prop.value.elements
                                        .filter((element): element is t.StringLiteral =>
                                            t.isStringLiteral(element),
                                        )
                                        .map((element) => element.value);
                                }
                            });

                            fonts.push(fontConfig as Font);
                        }
                    }
                });
            },
        });

        return fonts;
    } catch (error) {
        console.error('Error scanning fonts:', error);
        return [];
    }
}

/**
 * Updates the Tailwind configuration to include the new font family
 * Adds the font variable and fallback to the theme.fontFamily configuration
 */
async function updateTailwindFontConfig(projectRoot: string, font: Font): Promise<void> {
    try {
        const { configPath } = getConfigPath(projectRoot);
        if (!configPath) {
            console.log('No Tailwind config file found');
            return;
        }

        const configContent = fs.readFileSync(configPath, 'utf-8');

        const { isUpdated, output } = modifyTailwindConfig(configContent, {
            visitor: (path) => {
                // Find the theme property
                if (
                    t.isIdentifier(path.node.key) &&
                    path.node.key.name === 'theme' &&
                    t.isObjectExpression(path.node.value)
                ) {
                    // Look for fontFamily inside theme
                    const themeProps = path.node.value.properties;

                    let fontFamilyProp = themeProps.find(
                        (prop: any) =>
                            t.isObjectProperty(prop) &&
                            t.isIdentifier(prop.key) &&
                            prop.key.name === 'fontFamily',
                    ) as t.ObjectProperty | undefined;

                    // If fontFamily doesn't exist, create it
                    if (!fontFamilyProp) {
                        fontFamilyProp = t.objectProperty(
                            t.identifier('fontFamily'),
                            t.objectExpression([]),
                        );
                        themeProps.push(fontFamilyProp);
                    }

                    if (t.isObjectExpression(fontFamilyProp.value)) {
                        const fontExists = fontFamilyProp.value.properties.some(
                            (prop) =>
                                t.isObjectProperty(prop) &&
                                t.isIdentifier(prop.key) &&
                                prop.key.name === font.id,
                        );
                        if (!fontExists) {
                            const fontVarName = `var(--font-${font.id})`;
                            const fallback = font.type === 'google' ? 'sans-serif' : 'monospace';

                            const fontArray = t.arrayExpression([
                                t.stringLiteral(fontVarName),
                                t.stringLiteral(fallback),
                            ]);

                            // Add the new font property to fontFamily
                            fontFamilyProp.value.properties.push(
                                t.objectProperty(t.identifier(camelCase(font.id)), fontArray),
                            );

                            return true;
                        }
                    }
                }
                return false;
            },
        });

        if (isUpdated) {
            fs.writeFileSync(configPath, output);
        } else {
            console.log(
                `Font ${font.id} already exists in Tailwind config or couldn't update the config`,
            );
        }
    } catch (error) {
        console.error('Error updating Tailwind config with font:', error);
    }
}

/**
 * Removes a font configuration from the Tailwind config file
 * Cleans up the theme.fontFamily configuration by removing the specified font
 */
async function removeFontFromTailwindConfig(projectRoot: string, font: Font): Promise<void> {
    try {
        const { configPath } = getConfigPath(projectRoot);
        if (!configPath) {
            console.log('No Tailwind config file found');
            return;
        }

        const configContent = fs.readFileSync(configPath, 'utf-8');

        // Use the new modifyTailwindConfig utility
        const { isUpdated, output } = modifyTailwindConfig(configContent, {
            visitor: (path) => {
                // Find the theme property
                if (
                    t.isIdentifier(path.node.key) &&
                    path.node.key.name === 'theme' &&
                    t.isObjectExpression(path.node.value)
                ) {
                    // Look for fontFamily inside theme
                    const themeProps = path.node.value.properties;

                    const fontFamilyProp = themeProps.find(
                        (prop: any) =>
                            t.isObjectProperty(prop) &&
                            t.isIdentifier(prop.key) &&
                            prop.key.name === 'fontFamily',
                    ) as t.ObjectProperty | undefined;

                    if (fontFamilyProp && t.isObjectExpression(fontFamilyProp.value)) {
                        // Find the font to remove
                        const properties = fontFamilyProp.value.properties;
                        const fontIndex = properties.findIndex(
                            (prop: any) =>
                                t.isObjectProperty(prop) &&
                                t.isIdentifier(prop.key) &&
                                prop.key.name === font.id,
                        );

                        // If the font is found, remove it
                        if (fontIndex !== -1) {
                            properties.splice(fontIndex, 1);
                            return true; // Signal that we updated the config
                        }
                    }
                }
                return false;
            },
        });

        if (isUpdated) {
            fs.writeFileSync(configPath, output);
            console.log(`Removed font ${font.id} from Tailwind config`);
        } else {
            console.log(
                `Font ${font.id} not found in Tailwind config or couldn't update the config`,
            );
        }
    } catch (error) {
        console.error('Error removing font from Tailwind config:', error);
    }
}

/**
 * Adds a new font to the project by:
 * 1. Adding the font import and configuration to fonts.ts
 * 2. Updating Tailwind config with the new font family
 * 3. Adding the font variable to the appropriate layout file
 */
export async function addFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        const content = (await readFile(fontPath)) ?? '';

        if (!content) {
            await fs.writeFileSync(fontPath, '');
        }

        // Convert the font family to the import name format (Pascal case, no spaces)
        const importName = font.family.replace(/\s+/g, '_');
        const fontName = camelCase(font.id);
        // Check if the import already exists
        const importRegex = new RegExp(
            `import\\s*{[^}]*${importName}[^}]*}\\s*from\\s*['"]next/font/google['"]`,
        );
        const importExists = importRegex.test(content);

        // Check if the font export already exists
        const exportRegex = new RegExp(`export\\s+const\\s+${fontName}\\s*=`);
        const exportExists = exportRegex.test(content);

        if (exportExists) {
            console.log(`Font ${fontName} already exists in font.ts`);
            return;
        }

        let newContent = content;

        if (!importExists) {
            // Check if there's already an import from next/font/google
            const googleImportRegex = /import\s*{([^}]*)}\s*from\s*['"]next\/font\/google['"]/;
            const googleImportMatch = content.match(googleImportRegex);

            if (googleImportMatch) {
                const currentImports = googleImportMatch[1];
                const newImport = currentImports.includes(importName)
                    ? currentImports
                    : `${currentImports}, ${importName}`;
                newContent = newContent.replace(
                    googleImportRegex,
                    `import {${newImport}} from 'next/font/google'`,
                );
            } else {
                newContent = `import { ${importName} } from 'next/font/google';\n${newContent}`;
            }
        }

        const fontConfig = `
export const ${fontName} = ${importName}({
    subsets: [${font.subsets.map((s) => `'${s}'`).join(', ')}],
    weight: [${font.weight?.map((w) => `'${w}'`).join(', ')}],
    style: [${font.styles?.map((s) => `'${s}'`).join(', ')}],
    variable: '${font.variable}',
    display: 'swap',
});
`;

        // Add a blank line before the new font if the file doesn't end with blank lines
        if (!newContent.endsWith('\n\n')) {
            if (newContent.endsWith('\n')) {
                newContent += '\n';
            } else {
                newContent += '\n\n';
            }
        }

        newContent += fontConfig;

        await fs.writeFileSync(fontPath, newContent);

        await updateTailwindFontConfig(projectRoot, font);

        await addFontVariableToLayout(projectRoot, fontName);
    } catch (error) {
        console.error('Error adding font:', error);
    }
}

/**
 * Adds the font variable to the appropriate layout file based on the Next.js router type
 * For App Router: adds to app/layout.tsx
 * For Pages Router: adds to pages/_app.tsx
 */
async function addFontVariableToLayout(projectRoot: string, fontName: string): Promise<void> {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return;
        }

        if (routerConfig.type === 'app') {
            // App Router: Add to app/layout.tsx
            const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
            await addFontVariableToAppLayout(layoutPath, fontName);
        } else {
            // Pages Router: Add to pages/_app.tsx
            const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
            await addFontVariableToPageApp(appPath, fontName);
        }
    } catch (error) {
        console.error('Error adding font variable to layout:', error);
    }
}

/**
 * Creates a template literal expression that combines a font variable with existing classes
 */
function createTemplateLiteralWithFont(
    fontVarExpr: t.Expression,
    existingValue?: t.Expression,
): t.TemplateLiteral {
    const quasis = [
        t.templateElement({ raw: '', cooked: '' }, false),
        t.templateElement({ raw: ' ', cooked: ' ' }, false),
        t.templateElement({ raw: '', cooked: '' }, true),
    ];
    const expressions = existingValue ? [fontVarExpr, existingValue] : [fontVarExpr];
    return t.templateLiteral(quasis, expressions);
}

/**
 * Creates a string literal that combines a font class with existing classes
 */
function createStringLiteralWithFont(
    fontClassName: string,
    existingClasses: string,
): t.StringLiteral {
    const classes = filterFontClasses(existingClasses);
    classes.unshift(fontClassName);
    return t.stringLiteral(classes.join(' '));
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
    const fontPath = '@/' + DefaultSettings.FONT_FOLDER.replace(/^\.\//, '').replace(/\.ts$/, '');
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

    await fs.writeFileSync(filePath, newContent);
}

/**
 * Adds a font variable to specified target elements in a file
 * Updates the className attribute to include the font variable
 */
async function addFontVariableToElement(
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
                classNameAttr.value = t.jsxExpressionContainer(
                    createTemplateLiteralWithFont(
                        fontVarExpr,
                        t.stringLiteral(classNameAttr.value.value),
                    ),
                );
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

async function addFontVariableToAppLayout(layoutPath: string, fontName: string): Promise<void> {
    await addFontVariableToElement(layoutPath, fontName, ['html']);
}

async function addFontVariableToPageApp(appPath: string, fontName: string): Promise<void> {
    await addFontVariableToElement(appPath, fontName, ['div', 'main', 'section', 'body']);
}

/**
 * Removes a font from the project by:
 * 1. Removing the font from fonts.ts
 * 2. Removing the font from Tailwind config
 * 3. Removing the font variable from the layout file
 * 4. Updating default font if needed
 */
export async function removeFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        const content = await readFile(fontPath);

        if (!content) {
            return;
        }

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontIdToRemove = font.id;
        const importToRemove = font.family.replace(/\s+/g, '_');
        let removedFont = false;

        // Track all imports from next/font/google to know if we should remove the import
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/font/google') {
                    const importSpecifiers = path.node.specifiers.filter((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            return specifier.imported.name !== importToRemove;
                        }
                        return true;
                    });

                    if (importSpecifiers.length === 0) {
                        path.remove();
                    } else if (importSpecifiers.length !== path.node.specifiers.length) {
                        path.node.specifiers = importSpecifiers;
                    }
                }
            },

            ExportNamedDeclaration(path) {
                if (t.isVariableDeclaration(path.node.declaration)) {
                    const declarations = path.node.declaration.declarations;

                    for (let i = 0; i < declarations.length; i++) {
                        const declaration = declarations[i];

                        if (
                            t.isIdentifier(declaration.id) &&
                            declaration.id.name === fontIdToRemove
                        ) {
                            if (declarations.length === 1) {
                                path.remove();
                            } else {
                                declarations.splice(i, 1);
                            }
                            removedFont = true;
                            break;
                        }
                    }
                }
            },
        });

        if (removedFont) {
            const { code } = generate(ast);
            await fs.writeFileSync(fontPath, code);

            await removeFontFromTailwindConfig(projectRoot, font);

            const routerConfig = await detectRouterType(projectRoot);
            if (routerConfig) {
                if (routerConfig.type === 'app') {
                    const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
                    await removeFontVariableFromLayout(layoutPath, font.id, ['html']);
                } else {
                    const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
                    await removeFontVariableFromLayout(appPath, font.id, [
                        'div',
                        'main',
                        'section',
                        'body',
                    ]);
                }
            }

            const currentDefaultFont = await getDefaultFont(projectRoot);
            if (currentDefaultFont === font.id) {
                await setDefaultFont(projectRoot, null);
            }
        } else {
            console.log(`Font ${fontIdToRemove} not found in font.ts`);
        }
    } catch (error) {
        console.error('Error removing font:', error);
    }
}

/**
 * Removes a font variable from specified target elements in a layout file
 * Cleans up the className attribute and removes the font import if no longer needed
 */
async function removeFontVariableFromLayout(
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

        await traverseClassName(filePath, targetElements, async (classNameAttr, ast) => {
            if (t.isStringLiteral(classNameAttr.value)) {
                const classes = filterFontClasses(classNameAttr.value.value);
                classNameAttr.value = t.stringLiteral(classes.join(' '));
                updatedAst = true;
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;
                if (t.isTemplateLiteral(expr)) {
                    // Remove the font variable from expressions and track which ones to remove
                    const expressionsToKeep = expr.expressions.filter((e) => {
                        if (t.isMemberExpression(e)) {
                            const obj = e.object;
                            return !(t.isIdentifier(obj) && obj.name === fontId);
                        }
                        return true;
                    });

                    // Clean up template literals
                    if (expressionsToKeep.length === 0) {
                        const combinedText = expr.quasis
                            .map((quasi) => quasi.value.raw)
                            .join('')
                            .trim();
                        classNameAttr.value = t.stringLiteral(combinedText);
                    } else {
                        expr.expressions = expressionsToKeep;

                        const newQuasis = [];
                        for (let i = 0; i < expr.quasis.length; i++) {
                            const quasi = expr.quasis[i];
                            const value = {
                                raw: quasi.value.raw.trim(),
                                cooked: quasi.value.cooked?.trim() ?? quasi.value.raw.trim(),
                            };

                            if (i > 0 && i <= expressionsToKeep.length) {
                                value.raw = ' ' + value.raw;
                                value.cooked = ' ' + value.cooked;
                            }

                            if (i < expressionsToKeep.length) {
                                value.raw = value.raw + ' ';
                                value.cooked = value.cooked + ' ';
                            }

                            newQuasis.push(t.templateElement(value, i === expr.quasis.length - 1));
                        }

                        expr.quasis = newQuasis.slice(0, expressionsToKeep.length + 1);
                    }
                    updatedAst = true;
                }
            }

            if (updatedAst) {
                // Remove the font import if it exists
                const fontPath =
                    '@/' + DefaultSettings.FONT_FOLDER.replace(/^\.\//, '').replace(/\.ts$/, '');
                const importRegex = new RegExp(
                    `import\\s*{([^}]*)}\\s*from\\s*['"]${fontPath}['"]`,
                );
                const importMatch = content.match(importRegex);

                let newContent = generate(ast).code;

                if (importMatch) {
                    const currentImports = importMatch[1];
                    const newImports = currentImports
                        .split(',')
                        .map((imp) => imp.trim())
                        .filter((imp) => imp !== fontId)
                        .join(', ');

                    if (newImports) {
                        newContent = newContent.replace(
                            importRegex,
                            `import { ${newImports} } from '${fontPath}'`,
                        );
                    } else {
                        newContent = newContent.replace(importRegex, '');
                    }
                }

                await fs.writeFileSync(filePath, newContent);
            }
        });
    } catch (error) {
        console.error(`Error removing font variable from ${filePath}:`, error);
    }
}

/**
 * Sets the default font for the project by updating the appropriate layout file
 * Handles both App Router and Pages Router configurations
 */
export async function setDefaultFont(projectRoot: string, font: Font | null) {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return;
        }

        if (routerConfig.type === 'app') {
            const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
            if (font) {
                await updateFontInLayout(layoutPath, font, ['html']);
            } else {
                await removeFontVariableFromLayout(layoutPath, '', ['html']);
            }
        } else {
            const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
            if (font) {
                await updateFontInLayout(appPath, font, ['div', 'main', 'section', 'body']);
            } else {
                await removeFontVariableFromLayout(appPath, '', ['div', 'main', 'section', 'body']);
            }
        }
    } catch (error) {
        console.error('Error setting default font:', error);
    }
}

type TraverseCallback = (classNameAttr: t.JSXAttribute, ast: ParseResult<t.File>) => void;

/**
 * Traverses JSX elements in a file to find and modify className attributes
 * Used for adding or removing font variables from layout files
 */
async function traverseClassName(
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
 * Updates the font in a layout file by modifying className attributes
 * Handles both string literals and template literals in className
 */
async function updateFontInLayout(
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
        await fs.writeFileSync(filePath, result);
    }
}

/**
 * Detects the current font being used in a layout file
 * Extracts font information from className attributes
 */
async function detectCurrentFont(
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
