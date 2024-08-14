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

    // Define the path to vite.config.* file
    const configPath = path.resolve(process.cwd(), configFileName);

    if (!fs.existsSync(configPath)) {
        console.error(`${configFileName} not found`);
        return;
    }

    const viteConfigCode = fs.readFileSync(configPath, 'utf-8');

    // Parse the code into an AST
    const ast = parse(viteConfigCode, genASTParserOptionsByFileExtension(configFileExtension, 'module'));

    // Function to check if a plugin is already in the array
    function hasPlugin(pluginsArray, pluginName) {
        return pluginsArray.some(
            (plugin) => t.isStringLiteral(plugin) && plugin.value === pluginName
        );
    }

    // Traverse the AST to find the react() function call and add the Babel plugin
    traverse(ast, {
        CallExpression(path) {
            if (
                t.isIdentifier(path.node.callee, { name: 'react' })  // Check if it's the react() function
            ) {
                let configObject = {}
                const reactArgs = path.node.arguments;

                if (reactArgs.length === 0) {
                    // If react() has no arguments, create an object with babel: { plugins: [] }
                    reactArgs.push(
                        t.objectExpression([
                            t.objectProperty(
                                t.identifier('babel'),
                                t.objectExpression([t.objectProperty(t.identifier('plugins'), t.arrayExpression([]))])
                            ),
                        ]));
                }

                if (t.isObjectExpression(path.node.arguments[0])) {
                    configObject = path.node.arguments[0];
                }

                // Find the babel property
                let babelProperty = configObject.properties.find(
                    (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'babel' })
                );

                // If babel property doesn't exist, create it
                if (!babelProperty) {
                    babelProperty = t.objectProperty(
                        t.identifier('babel'),
                        t.objectExpression([t.objectProperty(t.identifier('plugins'), t.arrayExpression([]))])
                    );
                    configObject.properties.push(babelProperty);
                }

                // Ensure it's an object expression
                if (t.isObjectProperty(babelProperty) && t.isObjectExpression(babelProperty.value)) {
                    const babelConfig = babelProperty.value;

                    // Find the plugins array
                    let pluginsProperty = babelConfig.properties.find(
                        (property) => t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'plugins' })
                    );

                    // If plugins property doesn't exist, create it
                    if (!pluginsProperty) {
                        pluginsProperty = t.objectProperty(t.identifier('plugins'), t.arrayExpression([]));
                        babelConfig.properties.push(pluginsProperty);
                    }

                    // Ensure it's an array expression
                    if (t.isObjectProperty(pluginsProperty) && t.isArrayExpression(pluginsProperty.value)) {
                        const pluginsArray = pluginsProperty.value.elements;

                        // Add the plugin if it's not already there
                        if (!hasPlugin(pluginsArray, ONLOOK_BABEL_PLUGIN)) {
                            pluginsArray.push(t.stringLiteral(ONLOOK_BABEL_PLUGIN));
                        }
                    }
                }
            }
        },
    });

    // Generate the modified code from the AST
    const { code: modifiedCode } = generate(ast, {}, viteConfigCode);

    // Write the modified code back to the vite.config.ts file
    fs.writeFileSync(configPath, modifiedCode, 'utf-8');

    console.log(`${ONLOOK_BABEL_PLUGIN} plugin added to ${configFileName}`);
}

module.exports = {
    isViteJsProject,
    modifyViteConfig
}