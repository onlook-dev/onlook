const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const {
    CONFIG_FILE_PATTERN,
    BUILD_TOOL_NAME,
    DEPENDENCY_NAME,
    ONLOOK_BABEL_PLUGIN,
    VITEJS_CONFIG_BASE_NAME
} = require("./constants");
const {
    exists,
    hasDependency,
    isViteProjectSupportFileExtension,
    genASTParserOptionsByFileExtension
} = require("./utils");

// Function to check if a plugin is already in the array
function hasPlugin(pluginsArray, pluginName) {
    return pluginsArray.some(
        (plugin) =>
            (t.isStringLiteral(plugin) && plugin.value === pluginName) ||
            (t.isIdentifier(plugin) && plugin.name === pluginName) ||
            (t.isCallExpression(plugin) && t.isIdentifier(plugin.callee) && plugin.callee.name === pluginName)
    );
}

/**
 * Check if the current project is a Vite project
 * 
 * @returns {Promise<boolean>}
 */
const isViteJsProject = async () => {
    try {
        const configPath = CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.VITE];

        // Check if the configuration file exists
        if (!await exists(configPath)) {
            return false;
        }

        // Check if the dependency exists
        if (!await hasDependency(DEPENDENCY_NAME.VITE)) {
            return false
        }

        return true
    } catch (err) {
        console.error(err);
        return false;
    }
}

const modifyViteConfig = (configFileExtension) => {
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

    traverse(ast, {
        CallExpression(path) {
            if (t.isIdentifier(path.node.callee, { name: 'defineConfig' })) {
                const configArg = path.node.arguments[0];
                if (t.isObjectExpression(configArg)) {
                    let pluginsProperty = configArg.properties.find(
                        (prop) => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'plugins' })
                    );

                    if (!pluginsProperty) {
                        pluginsProperty = t.objectProperty(
                            t.identifier('plugins'),
                            t.arrayExpression([])
                        );
                        configArg.properties.push(pluginsProperty);
                    }

                    const pluginsArray = pluginsProperty.value.elements;

                    // Add react plugin if not present
                    if (!hasPlugin(pluginsArray, 'react')) {
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
                        pluginsArray.forEach((plugin) => {
                            if (t.isCallExpression(plugin) && t.isIdentifier(plugin.callee, { name: 'react' })) {
                                const reactConfig = plugin.arguments[0];
                                if (t.isObjectExpression(reactConfig)) {
                                    let babelProp = reactConfig.properties.find(
                                        (prop) => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'babel' })
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
                                        onlookBabelPluginAdded = true;
                                    } else if (t.isObjectExpression(babelProp.value)) {
                                        let pluginsProp = babelProp.value.properties.find(
                                            (prop) => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'plugins' })
                                        );

                                        if (!pluginsProp) {
                                            pluginsProp = t.objectProperty(
                                                t.identifier('plugins'),
                                                t.arrayExpression([t.stringLiteral(ONLOOK_BABEL_PLUGIN)])
                                            );
                                            babelProp.value.properties.push(pluginsProp);
                                            onlookBabelPluginAdded = true;
                                        } else if (t.isArrayExpression(pluginsProp.value)) {
                                            if (!hasPlugin(pluginsProp.value.elements, ONLOOK_BABEL_PLUGIN)) {
                                                pluginsProp.value.elements.push(t.stringLiteral(ONLOOK_BABEL_PLUGIN));
                                                onlookBabelPluginAdded = true;
                                            }
                                        }
                                    }
                                }
                            }
                        });
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
    if (!reactPluginAdded && !onlookBabelPluginAdded) {
        console.log(`No changes were necessary in ${configFileName}`);
    }
}

module.exports = {
    isViteJsProject,
    modifyViteConfig
}