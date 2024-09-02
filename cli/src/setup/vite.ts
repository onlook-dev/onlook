import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import {
    BUILD_TOOL_NAME,
    CONFIG_FILE_PATTERN,
    DEPENDENCY_NAME,
    ONLOOK_BABEL_PLUGIN,
    VITEJS_CONFIG_BASE_NAME
} from "./constants";
import {
    exists,
    genASTParserOptionsByFileExtension,
    hasDependency,
    isViteProjectSupportFileExtension
} from "./utils";

// Function to check if a plugin is already in the array
function hasPlugin(pluginsArray: t.Expression[], pluginName: string): boolean {
    return pluginsArray.some(
        (plugin) =>
            (t.isStringLiteral(plugin) && plugin.value === pluginName) ||
            (t.isIdentifier(plugin) && plugin.name === pluginName) ||
            (t.isCallExpression(plugin) && t.isIdentifier(plugin.callee) && plugin.callee.name === pluginName)
    );
}

export const isViteJsProject = async (): Promise<boolean> => {
    try {
        const configPath = CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.VITE];

        // Check if the configuration file exists
        if (!await exists(configPath)) {
            return false;
        }

        // Check if the dependency exists
        if (!await hasDependency(DEPENDENCY_NAME.VITE)) {
            return false;
        }

        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

export const modifyViteConfig = (configFileExtension: string): void => {
    if (!isViteProjectSupportFileExtension(configFileExtension)) {
        console.error('Unsupported file extension');
        return;
    }

    const configFileName = `${VITEJS_CONFIG_BASE_NAME}${configFileExtension}`;
    const configPath = path.resolve(process.cwd(), configFileName);

    if (!fs.existsSync(configPath)) {
        console.error(`${configFileName} not found`);
        return;
    }

    const viteConfigCode = fs.readFileSync(configPath, 'utf-8');
    const ast = parse(viteConfigCode, genASTParserOptionsByFileExtension(configFileExtension, 'module'));

    let reactPluginAdded = false;
    let onlookBabelPluginAdded = false;
    let reactImportAdded = false;

    // Add import for react plugin if it doesn't exist
    traverse(ast, {
        Program(path) {
            const reactImport = path.node.body.find(
                node => t.isImportDeclaration(node) &&
                    node.source.value === '@vitejs/plugin-react'
            );

            if (!reactImport) {
                path.node.body.unshift(
                    t.importDeclaration(
                        [t.importDefaultSpecifier(t.identifier('react'))],
                        t.stringLiteral('@vitejs/plugin-react')
                    )
                );
                reactImportAdded = true;
            }
        }
    });

    traverse(ast, {
        CallExpression(path) {
            if (t.isIdentifier(path.node.callee, { name: 'defineConfig' })) {
                const configArg = path.node.arguments[0];
                if (t.isObjectExpression(configArg)) {
                    let pluginsProperty = configArg.properties.find(
                        (prop): prop is t.ObjectProperty => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'plugins' })
                    );

                    if (!pluginsProperty) {
                        pluginsProperty = t.objectProperty(
                            t.identifier('plugins'),
                            t.arrayExpression([])
                        );
                        configArg.properties.push(pluginsProperty);
                    }

                    const pluginsArray = (pluginsProperty.value as t.ArrayExpression).elements;

                    // Find the react plugin
                    const reactPluginIndex = pluginsArray.findIndex(
                        (plugin) =>
                            (t.isIdentifier(plugin) && plugin.name === 'react') ||
                            (t.isCallExpression(plugin) && t.isIdentifier(plugin.callee) && plugin.callee.name === 'react')
                    );

                    if (reactPluginIndex === -1) {
                        // If react plugin doesn't exist, add it with the Onlook Babel plugin
                        const reactPlugin = t.callExpression(
                            t.identifier('react'),
                            [t.objectExpression([
                                t.objectProperty(
                                    t.identifier('babel'),
                                    t.objectExpression([
                                        t.objectProperty(
                                            t.identifier('plugins'),
                                            t.arrayExpression([t.stringLiteral(ONLOOK_BABEL_PLUGIN)])
                                        )
                                    ])
                                )
                            ])]
                        );
                        pluginsArray.push(reactPlugin);
                        reactPluginAdded = true;
                        onlookBabelPluginAdded = true;
                    } else {
                        // If react plugin exists, ensure it has the Onlook Babel plugin
                        const reactPlugin = pluginsArray[reactPluginIndex];
                        if (t.isCallExpression(reactPlugin) && reactPlugin.arguments.length === 0) {
                            // React plugin exists but has no arguments, add the configuration
                            reactPlugin.arguments.push(
                                t.objectExpression([
                                    t.objectProperty(
                                        t.identifier('babel'),
                                        t.objectExpression([
                                            t.objectProperty(
                                                t.identifier('plugins'),
                                                t.arrayExpression([t.stringLiteral(ONLOOK_BABEL_PLUGIN)])
                                            )
                                        ])
                                    )
                                ])
                            );
                            reactPluginAdded = true;
                            onlookBabelPluginAdded = true;
                        } else if (t.isCallExpression(reactPlugin) && reactPlugin.arguments.length > 0) {
                            // React plugin exists and has arguments, ensure it has the Onlook Babel plugin
                            const reactConfig = reactPlugin.arguments[0];
                            if (t.isObjectExpression(reactConfig)) {
                                let babelProp = reactConfig.properties.find(
                                    (prop): prop is t.ObjectProperty => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'babel' })
                                );

                                if (!babelProp) {
                                    babelProp = t.objectProperty(
                                        t.identifier('babel'),
                                        t.objectExpression([
                                            t.objectProperty(
                                                t.identifier('plugins'),
                                                t.arrayExpression([t.stringLiteral(ONLOOK_BABEL_PLUGIN)])
                                            )
                                        ])
                                    );
                                    reactConfig.properties.push(babelProp);
                                    reactPluginAdded = true;
                                    onlookBabelPluginAdded = true;
                                } else if (t.isObjectExpression(babelProp.value)) {
                                    let pluginsProp = babelProp.value.properties.find(
                                        (prop): prop is t.ObjectProperty => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'plugins' })
                                    );

                                    if (!pluginsProp) {
                                        pluginsProp = t.objectProperty(
                                            t.identifier('plugins'),
                                            t.arrayExpression([t.stringLiteral(ONLOOK_BABEL_PLUGIN)])
                                        );
                                        babelProp.value.properties.push(pluginsProp);
                                        reactPluginAdded = true;
                                        onlookBabelPluginAdded = true;
                                    } else if (t.isArrayExpression(pluginsProp.value)) {
                                        if (!hasPlugin(pluginsProp.value.elements as t.Expression[], ONLOOK_BABEL_PLUGIN)) {
                                            pluginsProp.value.elements.push(t.stringLiteral(ONLOOK_BABEL_PLUGIN));
                                            reactPluginAdded = true;
                                            onlookBabelPluginAdded = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    });

    const { code: modifiedCode } = generate(ast, {}, viteConfigCode);
    fs.writeFileSync(configPath, modifiedCode, 'utf-8');

    if (reactPluginAdded) {
        console.log(`React plugin added to ${configFileName}`);
    }
    if (onlookBabelPluginAdded) {
        console.log(`${ONLOOK_BABEL_PLUGIN} plugin added to ${configFileName}`);
    }
    if (reactImportAdded) {
        console.log(`React import added to ${configFileName}`);
    }
    if (!reactPluginAdded && !onlookBabelPluginAdded && !reactImportAdded) {
        console.log(`No changes were necessary in ${configFileName}`);
    }
};
