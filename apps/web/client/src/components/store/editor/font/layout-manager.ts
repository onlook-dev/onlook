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
import { generate, getAstFromContent, types as t, traverse, type t as T } from '@onlook/parser';
import { camelCase } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

export class LayoutManager {
    readonly fontImportPath = './fonts';

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    /**
     * Adds a font variable to the appropriate layout file
     */
    async addFontVariableToRootLayout(fontId: string): Promise<boolean> {
        try {
            const context = await this.getLayoutContext();
            if (!context) return false;

            const { layoutPath, targetElements } = context;

            const fontName = camelCase(fontId);
            let hasUpdated = false;

            const results = await this.traverseClassName(layoutPath, targetElements);
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
                    const newContent = addFontImportToFile(this.fontImportPath, fontName, ast);
                    if (!newContent) {
                        return false;
                    }
                    await this.editorEngine.sandbox.writeFile(layoutPath, newContent);
                }
            }
            return true;
        } catch (error) {
            console.error(`Error adding font variable to layout:`, error);
            return false;
        }
    }

    /**
     * Removes a font variable from the layout file
     */
    async removeFontVariableFromRootLayout(fontId: string): Promise<boolean> {
        try {
            const context = await this.getLayoutContext();
            if (!context) return false;
            const { layoutPath, targetElements } = context;

            let hasUpdated = false;
            const fontName = camelCase(fontId);

            // Traverse the className attributes in the layout file
            // and remove the font variable from the className attributes
            const results = await this.traverseClassName(
                layoutPath,
                targetElements,
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
                const newContent = removeFontImportFromFile(this.fontImportPath, fontName, ast);
                if (!newContent) {
                    return false;
                }
                return await this.editorEngine.sandbox.writeFile(layoutPath, newContent);
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
    async updateDefaultFontInRootLayout(font: Font): Promise<CodeDiff | null> {
        const context = await this.getLayoutContext();
        if (!context) return null;

        const { layoutPath, targetElements, layoutContent } = context;
        let updatedAst = false;
        const fontClassName = `font-${font.id}`;

        const results = await this.traverseClassName(
            layoutPath,
            targetElements,
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
    async getCurrentDefaultFont(): Promise<string | null> {
        try {
            const context = await this.getLayoutContext();
            if (!context) return null;
            const { layoutPath, targetElements } = context;
            let defaultFont: string | null = null;
            const normalizedFilePath = normalizePath(layoutPath);

            const results = await this.traverseClassName(normalizedFilePath, targetElements);
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

    private async traverseClassName(
        filePath: string,
        targetElements: string[],
        allElements = false,
    ): Promise<{
        classNameAttrs: T.JSXAttribute[];
        elementsFound: boolean;
        ast: T.File;
    } | null> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return null;
        }

        try {
            const file = await sandbox.readFile(filePath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${filePath}`);
                return null;
            }
            const content = file.content;
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

    private async getLayoutContext(): Promise<
        { layoutPath: string; targetElements: string[]; layoutContent: string } | undefined
    > {
        const layoutPath = await this.editorEngine.sandbox.getRootLayoutPath();
        const routerConfig = this.editorEngine.sandbox.routerConfig;

        if (!layoutPath || !routerConfig) {
            console.error('Could not get layout path or router config');
            return;
        }

        const file = await this.editorEngine.sandbox.readFile(layoutPath);
        if (!file || file.type === 'binary') {
            console.error(`Failed to read file: ${layoutPath}`);
            return;
        }

        const targetElements = getFontRootElements(routerConfig.type);
        const layoutContent = file.content;

        return { layoutPath, targetElements, layoutContent };
    }
}
