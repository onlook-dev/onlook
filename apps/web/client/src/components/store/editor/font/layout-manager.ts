import type { ParseResult } from '@babel/parser';
import * as t from '@babel/types';
import {
    cleanComma,
    createStringLiteralWithFont,
    findFontClass,
    getFontRootElements,
    removeFontImportFromFile,
    removeFontsFromClassName,
    updateClassNameWithFontVar,
} from '@onlook/fonts';
import type { CodeDiff, Font } from '@onlook/models';
import { RouterType } from '@onlook/models';
import { generate, parse, traverse } from '@onlook/parser';
import { camelCase } from 'lodash';
import { makeAutoObservable } from 'mobx';
import * as pathModule from 'path';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

type TraverseCallback = (
    classNameAttr: t.JSXAttribute,
    ast: ParseResult<t.File>,
) => void | Promise<void>;

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

            const { layoutPath, targetElements, layoutContent } = context;

            const fontName = camelCase(fontId);
            let updatedAst = false;
            let targetElementFound = false;

            await this.traverseClassName(layoutPath, targetElements, async (classNameAttr, ast) => {
                targetElementFound = true;
                updatedAst = updateClassNameWithFontVar(classNameAttr, fontName);

                if (updatedAst) {
                    await this.updateFileWithImport(layoutPath, layoutContent, ast, fontName);
                }
            });

            if (!targetElementFound) {
                console.log(
                    `Could not find target elements (${targetElements.join(', ')}) in ${layoutPath}`,
                );
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
            const { layoutPath, targetElements, layoutContent } = context;

            let updatedAst = false;
            let ast: ParseResult<t.File> | null = null;
            const fontName = camelCase(fontId);

            // Traverse the className attributes in the layout file
            // and remove the font variable from the className attributes
            await this.traverseClassName(
                layoutPath,
                targetElements,
                async (classNameAttr, currentAst) => {
                    ast = currentAst;
                    if (
                        removeFontsFromClassName(classNameAttr, {
                            fontIds: [fontName],
                        })
                    ) {
                        updatedAst = true;
                    }
                },
                true, // Should check all elements
            );

            if (updatedAst && ast) {
                // Remove the font import if it exists
                const newContent = removeFontImportFromFile(
                    this.fontImportPath,
                    fontName,
                    layoutContent,
                    ast,
                );
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
        let updatedAst = false;
        const fontClassName = `font-${font.id}`;
        let result = null;

        const context = await this.getLayoutContext();
        if (!context) return null;
        const { layoutPath, targetElements, layoutContent } = context;

        await this.traverseClassName(
            layoutPath,
            targetElements,
            (classNameAttr, ast) => {
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
                    const codeDiff: CodeDiff = {
                        original: layoutContent,
                        generated: code,
                        path: layoutPath,
                    };
                    result = codeDiff;
                }
            },
            true, // Should check all elements
        );

        return result;
    }
    /**
     * Detects the current font being used in a file
     */
    async detectCurrentFont(filePath: string, targetElements: string[]): Promise<string | null> {
        let currentFont: string | null = null;
        const normalizedFilePath = normalizePath(filePath);

        await this.traverseClassName(normalizedFilePath, targetElements, (classNameAttr) => {
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
     * Gets the default font from the project
     */
    async getDefaultFont(): Promise<string | null> {
        try {
            const context = await this.getLayoutContext();
            if (!context) return null;
            const { layoutPath, targetElements } = context;
            const defaultFont = await this.detectCurrentFont(layoutPath, targetElements);

            return defaultFont;
        } catch (error) {
            console.error('Error getting current font:', error);
            return null;
        }
    }

    /**
     * Gets the root layout path and router config
     */
    async getRootLayoutPath(): Promise<
        { layoutPath: string; routerConfig: { type: RouterType; basePath: string } } | undefined
    > {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const routerConfig = sandbox.routerConfig;
        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return;
        }

        // Determine the layout file path based on router type
        let layoutPath: string;

        if (routerConfig.type === RouterType.APP) {
            layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
        } else {
            layoutPath = pathModule.join(routerConfig.basePath, '_app.tsx');
        }

        return { layoutPath: normalizePath(layoutPath), routerConfig };
    }

    /**
     * Updates a file with a font import if needed
     */
    private async updateFileWithImport(
        filePath: string,
        content: string,
        ast: ParseResult<t.File>,
        fontName: string,
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return;
        }

        const { code } = generate(ast);
        const importRegex = new RegExp(
            `import\\s*{([^}]*)}\\s*from\\s*['"]${this.fontImportPath}['"]`,
        );

        const importMatch = content.match(importRegex);

        let newContent = code;

        if (importMatch?.[1]) {
            const currentImports = importMatch[1];
            if (currentImports && !currentImports.includes(fontName)) {
                const newImports = cleanComma(currentImports.trim() + `, ${fontName}`);

                newContent = newContent.replace(
                    importRegex,
                    `import { ${newImports} } from '${this.fontImportPath}'`,
                );
            }
        } else {
            const fontImport = `import { ${fontName} } from '${this.fontImportPath}';`;
            newContent = fontImport + '\n' + newContent;
        }

        await sandbox.writeFile(filePath, newContent);
    }

    private async traverseClassName(
        filePath: string,
        targetElements: string[],
        callback: TraverseCallback,
        allElements = false,
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        try {
            const file = await sandbox.readFile(filePath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${filePath}`);
                return;
            }
            const content = file.content;
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            traverse(ast, {
                JSXOpeningElement: (path) => {
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
                    } else {
                        callback(classNameAttr, ast);
                    }

                    if (!allElements) {
                        path.stop();
                    }
                },
            });
        } catch (error) {
            console.error(`Error traversing className in ${filePath}:`, error);
        }
    }

    private async getLayoutContext(): Promise<{ layoutPath: string; targetElements: string[], layoutContent: string } | undefined> {
        const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

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