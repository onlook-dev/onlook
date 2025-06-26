import { generate, parse, types as t, traverse, type t as T } from '@onlook/parser';
import { type FileOperations } from '@onlook/utility';
import { getLayoutPath } from './helpers';

/**
 * Removes the Built with Onlook script from a Next.js layout file
 * @param projectPath Path to the project root
 * @param fileOps File operations interface
 */
export async function removeBuiltWithScriptFromLayout(
    projectPath: string,
    fileOps: FileOperations,
): Promise<boolean> {
    try {
        const layoutPath = await getLayoutPath(projectPath, fileOps.fileExists);
        if (!layoutPath) {
            console.error('Layout file not found');
            return false;
        }

        // Read the layout file
        const layoutContent = await fileOps.readFile(layoutPath);
        if (!layoutContent) {
            console.error('Failed to read layout file');
            return false;
        }

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
                    // Remove all <Script src="/builtwith.js" ... /> elements
                    for (let i = 0; i < children.length; ) {
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
                                continue; // Don't increment i, as we just removed an element
                            }
                        }
                        i++;
                    }
                }
            },
        });

        // After removal, check if any <Script> elements remain in the entire AST
        hasOtherScriptElements = false;
        traverse(ast, {
            JSXElement(path) {
                if (
                    t.isJSXIdentifier(path.node.openingElement.name) &&
                    path.node.openingElement.name.name === 'Script'
                ) {
                    hasOtherScriptElements = true;
                    path.stop();
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
            const writeSuccess = await fileOps.writeFile(layoutPath, output.code);
            if (writeSuccess) {
                console.log('Successfully removed Script from layout.tsx');
                return true;
            } else {
                console.error('Failed to write modified layout.tsx');
                return false;
            }
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
 * @param fileOps File operations interface
 */
export async function removeBuiltWithScript(
    projectPath: string,
    fileOps: FileOperations,
): Promise<boolean> {
    try {
        // Path to the builtwith.js script in the project's public folder
        const scriptPath = `${projectPath}/public/builtwith.js`;

        // Check if the file exists
        const fileExists = await fileOps.fileExists(scriptPath);

        if (fileExists) {
            const deleteSuccess = await fileOps.delete(scriptPath, true);
            if (deleteSuccess) {
                console.log('Successfully removed builtwith.js from public folder');
                return true;
            } else {
                console.error('Failed to delete builtwith.js from public folder');
                return false;
            }
        } else {
            console.log('builtwith.js not found in public folder');
            return false;
        }
    } catch (error) {
        console.error('Error removing builtwith.js from public folder:', error);
        return false;
    }
}
