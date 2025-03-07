import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';
import { builtWithScript } from './script';

/**
 * Injects the Built with Onlook script into a Next.js layout file
 * @param projectPath Path to the project root
 */
export async function injectBuiltWithScript(projectPath: string): Promise<boolean> {
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

        let hasScriptImport = false;
        let scriptAdded = false;

        // Check if Script is already imported
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/script') {
                    hasScriptImport = true;
                }
            },
        });

        // Add Script import if it doesn't exist
        if (!hasScriptImport) {
            const scriptImport = t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier('Script'))],
                t.stringLiteral('next/script'),
            );

            // Find the position to insert the import
            let insertIndex = 0;
            for (let i = 0; i < ast.program.body.length; i++) {
                const node = ast.program.body[i];
                if (t.isImportDeclaration(node)) {
                    insertIndex = i + 1;
                } else {
                    break;
                }
            }

            ast.program.body.splice(insertIndex, 0, scriptImport);
        }

        // Add Script component to the body
        traverse(ast, {
            JSXElement(path) {
                // Check if this is the body element
                const openingElement = path.node.openingElement;
                if (
                    t.isJSXIdentifier(openingElement.name) &&
                    openingElement.name.name.toLowerCase() === 'body'
                ) {
                    // Check if Script is already added
                    const hasScript = path.node.children.some(
                        (child) =>
                            t.isJSXElement(child) &&
                            t.isJSXIdentifier(child.openingElement.name) &&
                            child.openingElement.name.name === 'Script' &&
                            child.openingElement.attributes.some(
                                (attr) =>
                                    t.isJSXAttribute(attr) &&
                                    t.isJSXIdentifier(attr.name) &&
                                    attr.name.name === 'src' &&
                                    t.isStringLiteral(attr.value) &&
                                    attr.value.value === '/builtwith.js',
                            ),
                    );

                    if (!hasScript) {
                        // Create Script element
                        const scriptElement = t.jsxElement(
                            t.jsxOpeningElement(
                                t.jsxIdentifier('Script'),
                                [
                                    t.jsxAttribute(
                                        t.jsxIdentifier('src'),
                                        t.stringLiteral('/builtwith.js'),
                                    ),
                                    t.jsxAttribute(
                                        t.jsxIdentifier('strategy'),
                                        t.stringLiteral('afterInteractive'),
                                    ),
                                ],
                                true,
                            ),
                            null,
                            [],
                            true,
                        );

                        // Add Script element after children
                        path.node.children.push(t.jsxText('\n                '));
                        path.node.children.push(scriptElement);
                        path.node.children.push(t.jsxText('\n            '));
                        scriptAdded = true;
                    }
                }
            },
        });

        if (scriptAdded) {
            // Generate the modified code
            const output = generate(ast, {}, layoutContent);

            // Write the modified code back to the file
            fs.writeFileSync(layoutPath, output.code, 'utf8');
            console.log('Successfully added Script to layout.tsx');
            return true;
        } else {
            console.log('Script already exists in layout.tsx or body tag not found');
            return false;
        }
    } catch (error) {
        console.error('Error injecting Script into layout.tsx:', error);
        return false;
    }
}

/**
 * Copies the builtwith.js script to the project's public folder
 * @param projectPath Path to the project root
 */
export async function addBuiltWithScript(projectPath: string): Promise<boolean> {
    try {
        // Ensure the public directory exists
        const publicDir = path.join(projectPath, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // Path to the destination in the project's public folder
        const destPath = path.join(publicDir, 'builtwith.js');

        // Read the content and write it directly
        fs.writeFileSync(destPath, builtWithScript, 'utf8');
        console.log('Successfully added builtwith.js to public folder');
        return true;
    } catch (error) {
        console.error('Error adding builtwith.js to public folder:', error);
        return false;
    }
}
