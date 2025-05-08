import { generate, parse, traverse, type t as T, types as t } from '@onlook/parser';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Removes the Built with Onlook script from a Next.js layout file
 * @param projectPath Path to the project root
 */
export async function removeBuiltWithScriptFromLayout(projectPath: string): Promise<boolean> {
    try {
        // Find the layout file
        const layoutPath = path.join(projectPath, 'app', 'layout.tsx');
        if (!fs.existsSync(layoutPath)) {
            console.error('Layout file not found at', layoutPath);
            return false;
        }

        // Read the layout file
        const layoutContent = fs.readFileSync(layoutPath, 'utf8');

        // Parse the layout file
        const ast = parse(layoutContent, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
        });

        let scriptImportRemoved = false;
        let scriptElementRemoved = false;
        let hasOtherScriptElements = false;

        // Remove Script component from the body
        traverse(ast, {
            JSXElement(path) {
                // Check if this is the body element
                const openingElement = path.node.openingElement;
                if (
                    t.isJSXIdentifier(openingElement.name) &&
                    openingElement.name.name.toLowerCase() === 'body'
                ) {
                    // Find and remove the Script element for builtwith.js
                    const children = path.node.children;
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if (
                            t.isJSXElement(child) &&
                            t.isJSXIdentifier(child.openingElement.name) &&
                            child.openingElement.name.name === 'Script'
                        ) {
                            // Check if this is the builtwith.js script
                            const hasSrcAttr = child.openingElement.attributes.some(
                                (attr) =>
                                    t.isJSXAttribute(attr) &&
                                    t.isJSXIdentifier(attr.name) &&
                                    attr.name.name === 'src' &&
                                    t.isStringLiteral(attr.value) &&
                                    attr.value.value === '/builtwith.js',
                            );

                            if (hasSrcAttr) {
                                // Remove this Script element
                                children.splice(i, 1);

                                // Also remove whitespace/newline nodes before/after if they exist
                                if (
                                    i > 0 &&
                                    t.isJSXText(children[i - 1]) &&
                                    (children[i - 1] as T.JSXText).value.trim() === ''
                                ) {
                                    children.splice(i - 1, 1);
                                    i--;
                                }
                                if (
                                    i < children.length &&
                                    t.isJSXText(children[i]) &&
                                    (children[i] as T.JSXText).value.trim() === ''
                                ) {
                                    children.splice(i, 1);
                                }

                                scriptElementRemoved = true;
                            } else {
                                // There's another Script element
                                hasOtherScriptElements = true;
                            }
                        }
                    }
                }
            },
        });

        // Only remove the Script import if there are no other Script elements
        if (scriptElementRemoved && !hasOtherScriptElements) {
            traverse(ast, {
                ImportDeclaration(path) {
                    if (
                        path.node.source.value === 'next/script' &&
                        path.node.specifiers.some(
                            (specifier) =>
                                t.isImportDefaultSpecifier(specifier) &&
                                t.isIdentifier(specifier.local) &&
                                specifier.local.name === 'Script',
                        )
                    ) {
                        path.remove();
                        scriptImportRemoved = true;
                    }
                },
            });
        }

        if (scriptElementRemoved || scriptImportRemoved) {
            // Generate the modified code
            const output = generate(ast, {}, layoutContent);

            // Write the modified code back to the file
            fs.writeFileSync(layoutPath, output.code, 'utf8');
            console.log('Successfully removed Script from layout.tsx');
            return true;
        } else {
            console.log('No Script for builtwith.js found in layout.tsx');
            return false;
        }
    } catch (error) {
        console.error('Error removing Script from layout.tsx:', error);
        return false;
    }
}

/**
 * Removes the builtwith.js script from the project's public folder
 * @param projectPath Path to the project root
 */
export async function removeBuiltWithScript(projectPath: string): Promise<boolean> {
    try {
        // Path to the builtwith.js script in the project's public folder
        const scriptPath = path.join(projectPath, 'public', 'builtwith.js');

        // Check if the file exists
        if (fs.existsSync(scriptPath)) {
            // Remove the file
            fs.unlinkSync(scriptPath);
            console.log('Successfully removed builtwith.js from public folder');
            return true;
        } else {
            console.log('builtwith.js not found in public folder');
            return false;
        }
    } catch (error) {
        console.error('Error removing builtwith.js from public folder:', error);
        return false;
    }
}
