import { camelCase } from 'lodash';

import {
    addFontImportToFile,
    createStringLiteralWithFont,
    findFontClass,
    getFontRootElements,
    removeFontImportFromFile,
    removeFontsFromClassName,
    updateClassNameWithFontVar,
    updateTemplateLiteralWithFontClass,
} from '@onlook/fonts';
import type { CodeDiff, Font } from '@onlook/models';
import type { T } from '@onlook/parser';
import { generate, getAstFromContent, t, traverse } from '@onlook/parser';

import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

const fontImportPath = './fonts';

export const addFontVariableToRootLayout = async (
    fontId: string,
    editorEngine: EditorEngine,
): Promise<boolean> => {
    try {
        const context = await getLayoutContext(editorEngine);
        if (!context) return false;

        const { layoutPath, targetElements } = context;

        const fontName = camelCase(fontId);
        let hasUpdated = false;

        const results = await traverseClassName(layoutPath, targetElements, editorEngine);
        if (!results) return false;
        const { classNameAttrs, elementsFound, ast } = results;

        if (elementsFound) {
            for (const classNameAttr of classNameAttrs) {
                const updated = updateClassNameWithFontVar(classNameAttr, fontName);
                if (updated) {
                    hasUpdated = true;
                }
            }
        }

        if (hasUpdated) {
            if (ast) {
                const newContent = addFontImportToFile(fontImportPath, fontName, ast);
                if (!newContent) {
                    return false;
                }
                await editorEngine.activeSandbox.writeFile(layoutPath, newContent);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Error adding font variable to layout:`, error);
        return false;
    }
}

/**
 * Removes a font variable from the layout file
 */
export const removeFontVariableFromRootLayout = async (
    fontId: string,
    editorEngine: EditorEngine,
): Promise<boolean> => {
    try {
        const context = await getLayoutContext(editorEngine);
        if (!context) return false;
        const { layoutPath, targetElements } = context;

        let hasUpdated = false;
        const fontName = camelCase(fontId);

        // Traverse the className attributes in the layout file
        // and remove the font variable from the className attributes
        const results = await traverseClassName(
            layoutPath,
            targetElements,
            editorEngine,
            true, // Should check all elements
        );

        if (!results) return false;
        const { classNameAttrs, elementsFound, ast } = results;

        if (elementsFound) {
            for (const classNameAttr of classNameAttrs) {
                const updated = removeFontsFromClassName(classNameAttr, {
                    fontIds: [fontName],
                });
                if (updated) {
                    hasUpdated = true;
                }
            }
        }

        if (hasUpdated && ast) {
            // Remove the font import if it exists
            const newContent = removeFontImportFromFile(fontImportPath, fontName, ast);
            if (!newContent) {
                return false;
            }
            await editorEngine.activeSandbox.writeFile(layoutPath, newContent);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error removing font variable`, error);
        return false;
    }
}

/**
 * Updates the default font in a layout file by modifying className attributes
 */
export const updateDefaultFontInRootLayout = async (
    font: Font,
    editorEngine: EditorEngine,
): Promise<CodeDiff | null> => {
    const context = await getLayoutContext(editorEngine);
    if (!context) return null;

    const { layoutPath, targetElements, layoutContent } = context;
    let updatedAst = false;
    const fontClassName = `font-${font.id}`;

    const results = await traverseClassName(
        layoutPath,
        targetElements,
        editorEngine,
        true, // Should check all elements
    );

    if (!results) return null;
    const { classNameAttrs, elementsFound, ast } = results;

    if (elementsFound) {
        for (const classNameAttr of classNameAttrs) {
            if (t.isStringLiteral(classNameAttr.value)) {
                classNameAttr.value = createStringLiteralWithFont(
                    fontClassName,
                    classNameAttr.value.value,
                );
                updatedAst = true;
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;
                if (t.isTemplateLiteral(expr)) {
                    const updated = updateTemplateLiteralWithFontClass(expr, fontClassName);
                    if (updated) {
                        updatedAst = true;
                    }
                }
            }
        }
    }

    if (updatedAst && ast) {
        const { code } = generate(ast);
        const codeDiff: CodeDiff = {
            original: layoutContent,
            generated: code,
            path: layoutPath,
        };
        return codeDiff;
    }

    return null;
}

/**
 * Gets the current default font from the project
 */
export const getCurrentDefaultFont = async (
    editorEngine: EditorEngine,
): Promise<string | null> => {
    try {
        const context = await getLayoutContext(editorEngine);
        if (!context) return null;
        const { layoutPath, targetElements } = context;
        let defaultFont: string | null = null;
        const normalizedFilePath = normalizePath(layoutPath);

        const results = await traverseClassName(normalizedFilePath, targetElements, editorEngine);
        if (!results) return null;
        const { classNameAttrs, elementsFound } = results;

        if (elementsFound) {
            for (const classNameAttr of classNameAttrs) {
                if (t.isStringLiteral(classNameAttr.value)) {
                    defaultFont = findFontClass(classNameAttr.value.value);
                } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                    const expr = classNameAttr.value.expression;
                    if (!expr || !t.isTemplateLiteral(expr)) {
                        continue;
                    }
                    const firstQuasi = expr.quasis[0];
                    if (firstQuasi) {
                        defaultFont = findFontClass(firstQuasi.value.raw);
                    }
                }
            }
        }
        return defaultFont;
    } catch (error) {
        console.error('Error getting current font:', error);
        return null;
    }
}

export const traverseClassName = async (
    filePath: string,
    targetElements: string[],
    editorEngine: EditorEngine,
    allElements = false,
): Promise<{
    classNameAttrs: T.JSXAttribute[];
    elementsFound: boolean;
    ast: T.File;
} | null> => {
    const sandbox = editorEngine.activeSandbox;
    if (!sandbox) {
        console.error('No sandbox session found');
        return null;
    }

    try {
        const file = await sandbox.readFile(filePath);
        if (typeof file !== 'string') {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }
        const content = file;
        const ast = getAstFromContent(content);
        if (!ast) {
            throw new Error(`Failed to parse file ${filePath}`);
        }

        const classNameAttrs: T.JSXAttribute[] = [];
        let elementsFound = false;

        traverse(ast, {
            JSXOpeningElement: (path) => {
                if (
                    !t.isJSXIdentifier(path.node.name) ||
                    !targetElements.includes(path.node.name.name)
                ) {
                    return;
                }

                elementsFound = true;

                let classNameAttr = path.node.attributes.find(
                    (attr): attr is T.JSXAttribute =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'className',
                );

                if (!classNameAttr) {
                    classNameAttr = t.jsxAttribute(
                        t.jsxIdentifier('className'),
                        t.stringLiteral(''),
                    );
                    path.node.attributes.push(classNameAttr);
                }

                classNameAttrs.push(classNameAttr);

                if (!allElements) {
                    path.stop();
                }
            },
        });

        return { classNameAttrs, elementsFound, ast };
    } catch (error) {
        console.error(`Error traversing className in ${filePath}:`, error);
        return null;
    }
}

export const getLayoutContext = async (
    editorEngine: EditorEngine,
): Promise<
    { layoutPath: string; targetElements: string[]; layoutContent: string } | undefined
> => {
    const layoutPath = await editorEngine.activeSandbox.getLayoutPath();
    const routerConfig = await editorEngine.activeSandbox.getRouterConfig();

    if (!layoutPath || !routerConfig) {
        console.error('Could not get layout path or router config');
        return;
    }

    const file = await editorEngine.activeSandbox.readFile(layoutPath);
    if (typeof file !== 'string') {
        console.error(`Layout file is not text: ${layoutPath}`);
        return;
    }

    const targetElements = getFontRootElements(routerConfig.type);
    const layoutContent = file;

    return { layoutPath, targetElements, layoutContent };
}


/**
 * Clears the default font from the layout file by removing font className from body
 */
export const clearDefaultFontFromRootLayout = async (
    fontId: string,
    editorEngine: EditorEngine,
): Promise<boolean> => {
    try {
        const context = await getLayoutContext(editorEngine);
        if (!context) return false;
        const { layoutPath } = context;

        const sandbox = editorEngine.activeSandbox;
        const file = await sandbox.readFile(layoutPath);
        if (typeof file !== 'string') return false;

        const content = file;
        const ast = getAstFromContent(content);
        if (!ast) return false;

        let hasUpdated = false;
        traverse(ast, {
            JSXOpeningElement: (path) => {
                if (!t.isJSXIdentifier(path.node.name)) return;
                if (path.node.name.name !== 'body') return;

                const classNameAttr = path.node.attributes.find(
                    (attr): attr is T.JSXAttribute =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'className',
                );

                if (!classNameAttr) return;

                const updated = removeFontsFromClassName(classNameAttr, {
                    fontIds: [fontId],
                });

                if (updated) {
                    hasUpdated = true;
                }
            },
        });

        if (hasUpdated) {
            const { code } = generate(ast);
            await editorEngine.activeSandbox.writeFile(layoutPath, code);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error clearing default font from layout:', error);
        return false;
    }
}
