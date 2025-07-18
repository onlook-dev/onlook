import {
    CUSTOM_OUTPUT_DIR,
    DEPRECATED_PRELOAD_SCRIPT_SRC,
    JS_FILE_EXTENSIONS,
    PRELOAD_SCRIPT_FILE_NAME,
    PRELOAD_SCRIPT_SRC,
} from '@onlook/constants';
import { type FileOperations } from '@onlook/utility';
import { genASTParserOptionsByFileExtension } from '../helpers';
import { generate, parse, type t as T, types as t, traverse } from '../packages';

enum CONFIG_BASE_NAME {
    NEXTJS = 'next.config',
    WEBPACK = 'webpack.config',
    VITEJS = 'vite.config',
}

const addConfigProperty = (
    ast: T.File,
    propertyName: string,
    propertyValue: T.Expression,
): boolean => {
    let propertyExists = false;

    traverse(ast, {
        ObjectExpression(path) {
            const properties = path.node.properties;
            let hasProperty = false;

            // Check if property already exists
            properties.forEach((prop) => {
                if (t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: propertyName })) {
                    hasProperty = true;
                    propertyExists = true;

                    // If the property value is an object expression, merge properties
                    if (t.isObjectExpression(prop.value) && t.isObjectExpression(propertyValue)) {
                        const existingProps = new Map(
                            prop.value.properties
                                .filter(
                                    (p): p is T.ObjectProperty =>
                                        t.isObjectProperty(p) && t.isIdentifier(p.key),
                                )
                                .map((p) => [(p.key as T.Identifier).name, p]),
                        );

                        // Add or update properties from propertyValue
                        propertyValue.properties.forEach((newProp) => {
                            if (t.isObjectProperty(newProp) && t.isIdentifier(newProp.key)) {
                                existingProps.set(newProp.key.name, newProp);
                            }
                        });

                        // Update the property value with merged properties
                        prop.value.properties = Array.from(existingProps.values());
                    } else {
                        // For non-object properties, just replace the value
                        prop.value = propertyValue;
                    }
                }
            });

            if (!hasProperty) {
                // Add the new property if it doesn't exist
                properties.push(t.objectProperty(t.identifier(propertyName), propertyValue));
                propertyExists = true;
            }

            // Stop traversing after the modification
            path.stop();
        },
    });

    return propertyExists;
};

const addTypescriptConfig = (ast: T.File): boolean => {
    return addConfigProperty(
        ast,
        'typescript',
        t.objectExpression([
            t.objectProperty(t.identifier('ignoreBuildErrors'), t.booleanLiteral(true)),
        ]),
    );
};

const addDistDirConfig = (ast: T.File): boolean => {
    return addConfigProperty(
        ast,
        'distDir',
        t.conditionalExpression(
            t.binaryExpression(
                '===',
                t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier('NODE_ENV'),
                ),
                t.stringLiteral('production'),
            ),
            t.stringLiteral(CUSTOM_OUTPUT_DIR),
            t.stringLiteral('.next'),
        ),
    );
};

export const addNextBuildConfig = async (fileOps: FileOperations): Promise<boolean> => {
    // Find any config file
    let configPath: string | null = null;
    let configFileExtension: string | null = null;

    // Try each possible extension
    for (const ext of JS_FILE_EXTENSIONS) {
        const fileName = `${CONFIG_BASE_NAME.NEXTJS}${ext}`;
        const testPath = fileName;
        if (await fileOps.fileExists(testPath)) {
            configPath = testPath;
            configFileExtension = ext;
            break;
        }
    }

    if (!configPath || !configFileExtension) {
        console.error('No Next.js config file found');
        return false;
    }

    console.log(`Adding standalone output configuration to ${configPath}...`);

    try {
        const data = await fileOps.readFile(configPath);

        if (!data) {
            console.error(`Error reading ${configPath}: file content not found`);
            return false;
        }

        const astParserOption = genASTParserOptionsByFileExtension(configFileExtension);
        const ast = parse(data, astParserOption);

        // Add both configurations
        const outputExists = addConfigProperty(ast, 'output', t.stringLiteral('standalone'));
        const distDirExists = addDistDirConfig(ast);
        const typescriptExists = addTypescriptConfig(ast);

        // Generate the modified code from the AST
        const updatedCode = generate(ast, {}, data).code;

        const success = await fileOps.writeFile(configPath, updatedCode);

        if (!success) {
            console.error(`Error writing ${configPath}`);
            return false;
        }

        console.log(
            `Successfully updated ${configPath} with standalone output, typescript configuration, and distDir`,
        );
        return outputExists && typescriptExists && distDirExists;
    } catch (error) {
        console.error(`Error processing ${configPath}:`, error);
        return false;
    }
};

export const injectPreloadScript = (ast: T.File): T.File => {
    let hasScriptImport = false;

    // Check if Script is already imported from next/script
    traverse(ast, {
        ImportDeclaration(path) {
            if (t.isStringLiteral(path.node.source) && path.node.source.value === 'next/script') {
                const hasScriptSpecifier = path.node.specifiers.some((spec) => {
                    return (
                        t.isImportDefaultSpecifier(spec) &&
                        t.isIdentifier(spec.local) &&
                        spec.local.name === 'Script'
                    );
                });
                if (hasScriptSpecifier) {
                    hasScriptImport = true;
                }
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

    // Remove deprecated script and any existing Onlook preload scripts
    ast = removePreloadScriptFromLayout(ast);

    let bodyFound = false;
    let htmlElement = null;

    // Find the body tag
    traverse(ast, {
        JSXElement(path) {
            if (t.isJSXIdentifier(path.node.openingElement.name, { name: 'body' })) {
                bodyFound = true;
                // Add Script component to the body
                ast = addScriptToBody(ast);
            } else if (t.isJSXIdentifier(path.node.openingElement.name, { name: 'html' })) {
                htmlElement = path.node;
            }
        },
    });

    if (!bodyFound && htmlElement) {
        createBodyTag(htmlElement);
    }

    return ast;
};

export function addScriptToBody(ast: T.File): T.File {
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
                                (t.isJSXAttribute(attr) &&
                                    t.isJSXIdentifier(attr.name) &&
                                    attr.name.name === 'id' &&
                                    t.isStringLiteral(attr.value) &&
                                    attr.value.value === PRELOAD_SCRIPT_FILE_NAME) ||
                                (t.isJSXAttribute(attr) &&
                                    t.isJSXIdentifier(attr.name) &&
                                    attr.name.name === 'src' &&
                                    t.isStringLiteral(attr.value) &&
                                    attr.value.value === PRELOAD_SCRIPT_FILE_NAME),
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
                                    t.stringLiteral(PRELOAD_SCRIPT_FILE_NAME),
                                ),
                                t.jsxAttribute(
                                    t.jsxIdentifier('strategy'),
                                    t.stringLiteral('beforeInteractive'),
                                ),
                                t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                                t.jsxAttribute(
                                    t.jsxIdentifier('id'),
                                    t.stringLiteral(PRELOAD_SCRIPT_FILE_NAME),
                                ),
                            ],
                            true,
                        ),
                        null,
                        [],
                        true,
                    );

                    // Handle self-closing tag
                    if (openingElement.selfClosing) {
                        openingElement.selfClosing = false;
                        path.node.closingElement = t.jsxClosingElement(t.jsxIdentifier('body'));
                    }

                    // Add Script element after children
                    path.node.children.push(t.jsxText('\n                '));
                    path.node.children.push(scriptElement);
                    path.node.children.push(t.jsxText('\n            '));
                }
            }
        },
    });

    return ast;
}

export function removePreloadScriptFromLayout(ast: T.File): T.File {
    traverse(ast, {
        JSXElement(path) {
            // Remove deprecated script
            if (
                t.isJSXIdentifier(path.node.openingElement.name, { name: 'Script' }) &&
                path.node.openingElement.attributes.some(
                    (attr) =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name, { name: 'src' }) &&
                        t.isStringLiteral(attr.value) &&
                        attr.value.value.includes(DEPRECATED_PRELOAD_SCRIPT_SRC),
                )
            ) {
                path.remove();
                return;
            }

            // Remove any existing Onlook preload scripts
            if (
                t.isJSXIdentifier(path.node.openingElement.name, { name: 'Script' }) &&
                path.node.openingElement.attributes.some(
                    (attr) =>
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name, { name: 'src' }) &&
                        t.isStringLiteral(attr.value) &&
                        (attr.value.value.includes(PRELOAD_SCRIPT_SRC) ||
                            attr.value.value.includes(PRELOAD_SCRIPT_FILE_NAME) ||
                            attr.value.value.includes('localhost:8083')),
                )
            ) {
                path.remove();
                return;
            }
        },
    });

    return ast;
}

function createBodyTag(htmlElement: T.JSXElement): T.JSXElement {
    const scriptElement = t.jsxElement(
        t.jsxOpeningElement(
            t.jsxIdentifier('Script'),
            [
                t.jsxAttribute(t.jsxIdentifier('src'), t.stringLiteral(PRELOAD_SCRIPT_FILE_NAME)),
                t.jsxAttribute(t.jsxIdentifier('strategy'), t.stringLiteral('beforeInteractive')),
                t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                t.jsxAttribute(t.jsxIdentifier('id'), t.stringLiteral(PRELOAD_SCRIPT_FILE_NAME)),
            ],
            false,
        ),
        t.jsxClosingElement(t.jsxIdentifier('Script')),
        [],
        false,
    );

    const bodyElement = t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('body'), [], false),
        t.jsxClosingElement(t.jsxIdentifier('body')),
        [scriptElement],
        false,
    );

    // Add the body element as the last child of html
    htmlElement.children.push(bodyElement);

    return htmlElement;
}
