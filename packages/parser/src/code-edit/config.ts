import {
    CUSTOM_OUTPUT_DIR,
    DEPRECATED_PRELOAD_SCRIPT_SRC,
    JS_FILE_EXTENSIONS,
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

    // Add Script import if not present
    if (!hasScriptImport) {
        const scriptImport = t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier('Script'))],
            t.stringLiteral('next/script'),
        );

        // Find the last import statement and add after it
        let lastImportIndex = -1;
        ast.program.body.forEach((node, index) => {
            if (t.isImportDeclaration(node)) {
                lastImportIndex = index;
            }
        });

        if (lastImportIndex >= 0) {
            ast.program.body.splice(lastImportIndex + 1, 0, scriptImport);
        } else {
            // If no imports found, add at the beginning
            ast.program.body.unshift(scriptImport);
        }
    }

    let headFound = false;
    let htmlElement = null;

    // First pass: Look for existing head tag and html element
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

            // If head tag found, add Script to it
            if (
                t.isJSXOpeningElement(path.node.openingElement) &&
                t.isJSXIdentifier(path.node.openingElement.name)
            ) {
                const elementName = path.node.openingElement.name.name;

                if (elementName === 'head' || elementName === 'Head') {
                    headFound = true;
                    // Add Script to existing head
                    addScriptToHead(path.node);
                } else if (elementName === 'html' || elementName === 'Html') {
                    htmlElement = path.node;
                }
            }
        },
    });

    // If no head tag found, create one and add it to html element
    if (!headFound && htmlElement) {
        createAndAddHeadTag(htmlElement);
    }

    return ast;
};

function addScriptToHead(headElement: T.JSXElement) {
    // Check if Script with our specific src already exists
    let hasOnlookScript = false;

    if (headElement.children) {
        headElement.children.forEach(
            (
                child:
                    | T.JSXElement
                    | T.JSXFragment
                    | T.JSXText
                    | T.JSXExpressionContainer
                    | T.JSXSpreadChild,
            ) => {
                if (
                    t.isJSXElement(child) &&
                    t.isJSXIdentifier(child.openingElement.name) &&
                    child.openingElement.name.name === 'Script'
                ) {
                    const srcAttr = child.openingElement.attributes.find(
                        (attr: T.JSXAttribute | T.JSXSpreadAttribute) => {
                            return (
                                t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === 'src' &&
                                t.isStringLiteral(attr.value) &&
                                attr.value.value.includes(PRELOAD_SCRIPT_SRC)
                            );
                        },
                    );
                    if (srcAttr) {
                        hasOnlookScript = true;
                    }
                }
            },
        );
    }

    if (!hasOnlookScript) {
        // Create the Script JSX element
        const scriptElement = t.jsxElement(
            t.jsxOpeningElement(
                t.jsxIdentifier('Script'),
                [
                    t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                    t.jsxAttribute(t.jsxIdentifier('src'), t.stringLiteral(PRELOAD_SCRIPT_SRC)),
                ],
                true,
            ),
            null,
            [],
            true,
        );

        if (headElement.openingElement.selfClosing) {
            headElement.openingElement.selfClosing = false;
            headElement.closingElement = t.jsxClosingElement(headElement.openingElement.name);
        }

        // Add the Script element as the first child of head
        if (!headElement.children) {
            headElement.children = [];
        }
        headElement.children.unshift(scriptElement);
    }
}

function createAndAddHeadTag(htmlElement: T.JSXElement) {
    // Create the Script JSX element
    const scriptElement = t.jsxElement(
        t.jsxOpeningElement(
            t.jsxIdentifier('Script'),
            [
                t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                t.jsxAttribute(t.jsxIdentifier('src'), t.stringLiteral(PRELOAD_SCRIPT_SRC)),
            ],
            true,
        ),
        null,
        [],
        true,
    );

    // Create the head element with the Script as its child
    const headElement = t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('head'), [], false),
        t.jsxClosingElement(t.jsxIdentifier('head')),
        [scriptElement],
        false,
    );

    // Add the head element as the first child of html
    if (!htmlElement.children) {
        htmlElement.children = [];
    }
    htmlElement.children.unshift(headElement);
}
