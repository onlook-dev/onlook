import type { ParseResult } from '@babel/parser';
import * as t from '@babel/types';
import { RouterType } from '@onlook/models';
import {
    createStringLiteralWithFont,
    createTemplateLiteralWithFont,
    findFontClass,
    removeFontsFromClassName,
    removeFontImportFromFile,
    cleanComma,
    getTargetElementsByType,
} from '@onlook/fonts';
import type { Font } from '@onlook/models';
import { generate, parse, traverse } from '@onlook/parser';
import { camelCase } from 'lodash';
import * as pathModule from 'path';
import { normalizePath } from '../sandbox/helpers';
import type { EditorEngine } from '../engine';

type TraverseCallback = (
    classNameAttr: t.JSXAttribute,
    ast: ParseResult<t.File>,
) => void | Promise<void>;

interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}

export class LayoutManager {
    readonly fontImportPath = './fonts';

    constructor(private editorEngine: EditorEngine) {}

    /**
     * Adds a font variable to the appropriate layout file
     */
    async addFontVariableToLayout(fontId: string): Promise<boolean> {
        try {
            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return false;
            }

            const fontName = camelCase(fontId);
            const targetElements = getTargetElementsByType(routerConfig.type);
            await this.addFontVariableToElement(layoutPath, fontName, targetElements);
            return true;
        } catch (error) {
            console.error(`Error adding font variable to layout:`, error);
            return false;
        }
    }

    /**
     * Removes a font variable from the layout file
     */
    async removeFontVariableFromLayout(fontId: string): Promise<boolean> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return false;
            }

            const targetElements = getTargetElementsByType(routerConfig.type);

            const file = await sandbox.readFile(layoutPath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${layoutPath}`);
                return false;
            }
            const content = file.content;

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
            );

            if (updatedAst && ast) {
                // Remove the font import if it exists
                const newContent = removeFontImportFromFile(
                    this.fontImportPath,
                    fontName,
                    content,
                    ast,
                );
                if (!newContent) {
                    return false;
                }
                return await sandbox.writeFile(layoutPath, newContent);
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
    async updateDefaultFontInRootLayout(
        filePath: string,
        font: Font,
        targetElements: string[],
    ): Promise<CodeDiff | null> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return null;
        }

        let updatedAst = false;
        const fontClassName = `font-${font.id}`;
        let result = null;

        const normalizedFilePath = normalizePath(filePath);

        const file = await sandbox.readFile(normalizedFilePath);
        if (!file || file.type === 'binary') {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }
        const content = file.content;

        await this.traverseClassName(
            normalizedFilePath,
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
                        original: content,
                        generated: code,
                        path: normalizedFilePath,
                    };
                    result = codeDiff;
                }
            },
        );

        return result;
    }

    /**
     * Detects the current font being used in a layout file
     */
    async detectCurrentFont(filePath: string, targetElements: string[]): Promise<string | null> {
        let currentFont: string | null = null;
        const normalizedFilePath = normalizePath(filePath);

        await this.traverseClassName(
            normalizedFilePath,
            targetElements,
            (classNameAttr) => {
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
            },
        );

        return currentFont;
    }

    /**
     * Gets the default font from the project
     */
    async getDefaultFont(): Promise<string | null> {
        try {
            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return null;
            }

            const targetElements = getTargetElementsByType(routerConfig.type);
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

        const routerConfig = this.editorEngine.sandbox.routerConfig;
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

    /**
     * Adds a font variable to specified target elements in a file
     */
    private async addFontVariableToElement(
        filePath: string,
        fontName: string,
        targetElements: string[],
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return;
        }
        const normalizedFilePath = normalizePath(filePath);

        try {
            const file = await sandbox.readFile(normalizedFilePath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${filePath}`);
                return;
            }
            const content = file.content;
            let updatedAst = false;
            let targetElementFound = false;

            await this.traverseClassName(
                normalizedFilePath,
                targetElements,
                async (classNameAttr, ast) => {
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
                                    expr.quasis.push(
                                        t.templateElement({ raw: '', cooked: '' }, true),
                                    );
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
                        await this.updateFileWithImport(normalizedFilePath, content, ast, fontName);
                    }
                },
            );

            if (!targetElementFound) {
                console.log(
                    `Could not find target elements (${targetElements.join(', ')}) in ${normalizedFilePath}`,
                );
            }
        } catch (error) {
            console.error(`Error adding font variable to ${normalizedFilePath}:`, error);
        }
    }

    private async traverseClassName(
        filePath: string,
        targetElements: string[],
        callback: TraverseCallback,
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
                        void callback(newClassNameAttr, ast);
                        return;
                    }
                    void callback(classNameAttr, ast);
                },
            });
        } catch (error) {
            console.error(`Error traversing className in ${filePath}:`, error);
        }
    }
}
