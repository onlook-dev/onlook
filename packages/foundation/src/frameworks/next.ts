#!/usr/bin/env node
/**
 * Next.js Framework utilities
 *
 * Usage with editorEngine.sandbox:
 *
 * const fileOps = {
 *   readFile: (path: string) => editorEngine.sandbox.readFile(path),
 *   writeFile: (path: string, content: string) => editorEngine.sandbox.writeFile(path, content),
 *   fileExists: (path: string) => editorEngine.sandbox.fileExists(path)
 * };
 *
 * // Then use the functions:
 * await isNextJsProject(fileOps);
 * await modifyNextConfig('.js', fileOps);
 * await addNextBuildConfig(fileOps);
 * await removeNextCache(fileOps);
 */
import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

import {
    checkVariableDeclarationExist,
    genASTParserOptionsByFileExtension,
    genImportDeclaration,
    isSupportFileExtension,
} from '../utils';

import { CONFIG_BASE_NAME, ONLOOK_PLUGIN } from '../constants';
import { CUSTOM_OUTPUT_DIR } from '@onlook/constants';

// File operation types
type FileOperations = {
    readFile: (filePath: string) => Promise<string | null>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    fileExists: (filePath: string) => Promise<boolean>;
    copyDir: (source: string, destination: string) => Promise<boolean>;
    copyFile: (source: string, destination: string) => Promise<boolean>;
};

export const modifyNextConfig = async (
    configFileExtension: string,
    fileOps: FileOperations,
): Promise<void> => {
    if (!isSupportFileExtension(configFileExtension)) {
        console.error('Unsupported file extension');
        return;
    }

    const configFileName = `${CONFIG_BASE_NAME.NEXTJS}${configFileExtension}`;

    // Define the path to next.config.* file
    const configPath = configFileName;

    if (!(await fileOps.fileExists(configPath))) {
        console.error(`${configFileName} not found`);
        return;
    }

    console.log(`Adding ${ONLOOK_PLUGIN.NEXTJS} plugin into ${configFileName} file...`);

    try {
        // Read the existing next.config.* file from localforage
        const data = await fileOps.readFile(configPath);

        if (!data) {
            console.error(`Error reading ${configPath}: file content not found`);
            return;
        }

        const astParserOption = genASTParserOptionsByFileExtension(configFileExtension);

        // Parse the file content to an AST
        const ast = parse(data, astParserOption);

        let hasPathImport = false;

        // Traverse the AST to find the experimental.swcPlugins array
        traverse(ast, {
            VariableDeclarator(path) {
                // check if path is imported in .js file
                if (checkVariableDeclarationExist(path, 'path')) {
                    hasPathImport = true;
                }
            },
            ImportDeclaration(path) {
                // check if path is imported in .mjs file
                if (path.node.source.value === 'path') {
                    hasPathImport = true;
                }
            },
            ObjectExpression(path) {
                const properties = path.node.properties;
                let experimentalProperty: t.ObjectProperty | undefined;

                // Find the experimental property
                properties.forEach((prop) => {
                    if (
                        t.isObjectProperty(prop) &&
                        t.isIdentifier(prop.key, { name: 'experimental' })
                    ) {
                        experimentalProperty = prop;
                    }
                });

                if (!experimentalProperty) {
                    // If experimental property is not found, create it
                    experimentalProperty = t.objectProperty(
                        t.identifier('experimental'),
                        t.objectExpression([]),
                    );
                    properties.push(experimentalProperty);
                }

                // Ensure experimental is an ObjectExpression
                if (!t.isObjectExpression(experimentalProperty.value)) {
                    experimentalProperty.value = t.objectExpression([]);
                }

                const experimentalProperties = experimentalProperty.value.properties;
                let swcPluginsProperty: t.ObjectProperty | undefined;

                // Find the swcPlugins property
                experimentalProperties.forEach((prop) => {
                    if (
                        t.isObjectProperty(prop) &&
                        t.isIdentifier(prop.key, { name: 'swcPlugins' })
                    ) {
                        swcPluginsProperty = prop;
                    }
                });

                if (!swcPluginsProperty) {
                    // If swcPlugins property is not found, create it
                    swcPluginsProperty = t.objectProperty(
                        t.identifier('swcPlugins'),
                        t.arrayExpression([]),
                    );
                    experimentalProperties.push(swcPluginsProperty);
                }

                // Ensure swcPlugins is an ArrayExpression
                if (!t.isArrayExpression(swcPluginsProperty.value)) {
                    swcPluginsProperty.value = t.arrayExpression([]);
                }

                // Add the new plugin configuration to swcPlugins array
                const pluginConfig = t.arrayExpression([
                    t.stringLiteral(ONLOOK_PLUGIN.NEXTJS),
                    t.objectExpression([
                        t.objectProperty(
                            t.identifier('root'),
                            t.callExpression(
                                t.memberExpression(t.identifier('path'), t.identifier('resolve')),
                                [t.stringLiteral('.')],
                            ),
                        ),
                    ]),
                ]);

                swcPluginsProperty.value.elements.push(pluginConfig);

                // Stop traversing after the modification
                path.stop();
            },
        });

        // If 'path' is not imported, add the import statement
        if (!hasPathImport) {
            const importDeclaration = genImportDeclaration(configFileExtension, 'path');
            importDeclaration && ast.program.body.unshift(importDeclaration);
        }

        // Generate the modified code from the AST
        const updatedCode = generate(ast, {}, data).code;

        // Write the updated content back to localforage
        const success = await fileOps.writeFile(configPath, updatedCode);

        if (!success) {
            console.error(`Error writing ${configPath}`);
            return;
        }

        console.log(`Successfully updated ${configPath}`);
    } catch (error) {
        console.error(`Error processing ${configPath}:`, error);
    }
};

export const removeNextCache = async (fileOps: FileOperations): Promise<void> => {
    const nextCachePath = '.next';
    const exists = await fileOps.fileExists(nextCachePath);

    if (exists) {
        console.log('Removing Nextjs cache from localforage...');
        // Note: sandbox doesn't have a direct delete method, so we just log a warning
        console.warn('Cache removal not implemented for sandbox - manual cleanup may be required');
        console.log('Next.js cache removal noted');
    } else {
        console.log('No Next.js cache found, skipping cleanup...');
    }
};

const addConfigProperty = (
    ast: t.File,
    propertyName: string,
    propertyValue: t.Expression,
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
                                    (p): p is t.ObjectProperty =>
                                        t.isObjectProperty(p) && t.isIdentifier(p.key),
                                )
                                .map((p) => [(p.key as t.Identifier).name, p]),
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

const addTypescriptConfig = (ast: t.File): boolean => {
    return addConfigProperty(
        ast,
        'typescript',
        t.objectExpression([
            t.objectProperty(t.identifier('ignoreBuildErrors'), t.booleanLiteral(true)),
        ]),
    );
};

const addDistDirConfig = (ast: t.File): boolean => {
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
    const possibleExtensions = ['.js', '.ts', '.mjs', '.cjs'];
    let configPath: string | null = null;
    let configFileExtension: string | null = null;

    // Try each possible extension
    for (const ext of possibleExtensions) {
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
