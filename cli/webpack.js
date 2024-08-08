const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const {
    DEPENDENCY_NAME,
    CONFIG_FILE_PATTERN,
    BUILD_TOOL_NAME,
    WEBPACK_CONFIG_BASE_NAME,
    ONLOOK_WEBPACK_PLUGIN,
    BABELRC_FILE
} = require("./constants");

const { exists, hasDependency, isSupportFileExtension } = require("./utils");


/**
 * Check if the current project is a Webpack project
 * 
 * @returns {Promise<boolean>}
 */
const isWebpackProject = async () => {
    try {
        const configPath = CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.WEBPACK];

        // Check if the configuration file exists
        if (!await exists(configPath)) {
            return false;
        }

        // Check if the dependency exists
        if (!await hasDependency(DEPENDENCY_NAME.WEBPACK)) {
            return false
        }

        return true
    } catch (err) {
        console.error(err);
        return false;
    }
}

/**
 * Babel rule to be added to the webpack.config.* file
 */
const babelRule = t.objectExpression([
    t.objectProperty(t.identifier('test'), t.regExpLiteral('\\.(js|mjs|cjs|ts|tsx|jsx)$')),
    t.objectProperty(t.identifier('exclude'), t.regExpLiteral('\\/node_modules\\/')),
    t.objectProperty(t.identifier('use'), t.objectExpression([
        t.objectProperty(t.identifier('loader'), t.stringLiteral('babel-loader')),
        t.objectProperty(t.identifier('options'), t.objectExpression([
            t.objectProperty(t.identifier('presets'), t.arrayExpression([
                t.stringLiteral('@babel/preset-env'),
                t.stringLiteral('@babel/preset-react')
            ]))
        ]))
    ]))
]);

/**
 * Add the babel rule to the webpack.config.js file
 * 
 * @param {string} configFileExtension 
 * @returns 
 */
function modifyWebpackConfig(configFileExtension) {
    if (!isSupportFileExtension(configFileExtension)) {
        console.error('Unsupported file extension');
        return;
    }

    const configFileName = `${WEBPACK_CONFIG_BASE_NAME}${configFileExtension}`;

    // Define the path to webpack.config.* file
    const configPath = path.resolve(process.cwd(), configFileName);

    if (!fs.existsSync(configPath)) {
        console.error(`${configFileName} not found`);
        return;
    }


    fs.readFile(configPath, 'utf8', (err, fileContent) => {
        if (err) {
            console.error(`Error reading ${configPath}:`, err);
            return;
        }

        const ast = parse(fileContent, { sourceType: 'module' });

        let rulesArray;

        // Traverse the AST to find the module.rules array
        traverse(ast, {
            ObjectProperty(path) {
                if (path.node.key.name === 'module' && t.isObjectExpression(path.node.value)) {
                    const moduleProperties = path.node.value.properties;
                    moduleProperties.forEach(property => {
                        if (property.key.name === 'rules' && t.isArrayExpression(property.value)) {
                            rulesArray = property.value.elements;
                        }
                    });

                    // If module.rules does not exist, create it
                    if (!rulesArray) {
                        const rulesProperty = t.objectProperty(
                            t.identifier('rules'),
                            t.arrayExpression([])
                        );
                        path.node.value.properties.push(rulesProperty);
                        rulesArray = rulesProperty.value.elements;
                    }
                }
            }
        });

        // Add the babel rule to the rules array
        if (rulesArray) {
            rulesArray.push(babelRule);
        }

        // Generate the updated code
        const updatedCode = generate(ast, {}, fileContent).code;
        // Write the updated content back to next.config.* file
        fs.writeFile(configPath, updatedCode, 'utf8', (err) => {
            if (err) {
                console.error(`Error writing ${configPath}:`, err);
                return;
            }

            console.log(`Successfully updated ${configPath}`);
        });
    })
}

// Path to the .babelrc file
const babelrcPath = path.resolve(BABELRC_FILE);

// Default .babelrc content if it doesn't exist
const defaultBabelrcContent = {
    plugins: []
};

/**
 * Modify the .babelrc file to include the "@onlook/react" plugin
 * 
 */
const modifyBabelrc = () => {
    let babelrcContent;

    // Check if .babelrc file exists
    if (fs.existsSync(babelrcPath)) {
        // Read the .babelrc file
        const fileContent = fs.readFileSync(babelrcPath, 'utf8');
        babelrcContent = JSON.parse(fileContent);
    } else {
        // Use default .babelrc content if file does not exist
        babelrcContent = defaultBabelrcContent;
    }

    // Ensure plugins array exists
    if (!Array.isArray(babelrcContent.plugins)) {
        babelrcContent.plugins = [];
    }

    // Check if "@onlook/react" is already in the plugins array
    if (!babelrcContent.plugins.includes(ONLOOK_WEBPACK_PLUGIN)) {
        // Add "@onlook/react" to the plugins array
        babelrcContent.plugins.push(ONLOOK_WEBPACK_PLUGIN);
    }

    // Write the updated content back to the .babelrc file
    fs.writeFileSync(babelrcPath, JSON.stringify(babelrcContent, null, 2), 'utf8');
    console.log('.babelrc has been updated with the "@onlook/react" plugin.');
}

module.exports = {
    modifyBabelrc,
    isWebpackProject,
    modifyWebpackConfig
}