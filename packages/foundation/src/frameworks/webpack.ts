import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import {
    BABELRC_FILE,
    BUILD_TOOL_NAME,
    CONFIG_BASE_NAME,
    CONFIG_FILE_PATTERN,
    DEPENDENCY_NAME,
    ONLOOK_PLUGIN,
} from "../constants";

import { exists, hasDependency, isSupportFileExtension } from "../utils";

export const isWebpackProject = async (): Promise<boolean> => {
    try {
        const configPath = CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.WEBPACK];

        // Check if the configuration file exists
        if (!await exists(configPath)) {
            return false;
        }

        // Check if the dependency exists
        if (!await hasDependency(DEPENDENCY_NAME.WEBPACK)) {
            return false;
        }

        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

/**
 * Babel rule to be added to the webpack.config.* file
 */
const babelRule: t.ObjectExpression = t.objectExpression([
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

export function modifyWebpackConfig(configFileExtension: string): void {
    if (!isSupportFileExtension(configFileExtension)) {
        console.error('Unsupported file extension');
        return;
    }

    const configFileName = `${CONFIG_BASE_NAME.WEBPACK}${configFileExtension}`;

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

        let rulesArray: t.Expression[] | undefined;

        // Traverse the AST to find the module.rules array
        traverse(ast, {
            ObjectProperty(path) {
                // @ts-ignore
                if (path.node.key.name === 'module' && t.isObjectExpression(path.node.value)) {
                    const moduleProperties = path.node.value.properties;
                    moduleProperties.forEach(property => {
                        if (t.isObjectProperty(property) &&
                            t.isIdentifier(property.key) &&
                            property.key.name === 'rules' &&
                            t.isArrayExpression(property.value)) {
                            rulesArray = property.value.elements as t.Expression[];
                        }
                    });

                    // If module.rules does not exist, create it
                    if (!rulesArray) {
                        const rulesProperty = t.objectProperty(
                            t.identifier('rules'),
                            t.arrayExpression([])
                        );
                        path.node.value.properties.push(rulesProperty);
                        rulesArray = (rulesProperty.value as t.ArrayExpression).elements as t.Expression[];
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
    });
}

// Path to the .babelrc file
const babelrcPath = path.resolve(BABELRC_FILE);

// Default .babelrc content if it doesn't exist
const defaultBabelrcContent = {
    plugins: []
};

/**
 * Modify the .babelrc file to include the "@onlook/react" plugin
 */
export const modifyBabelrc = (): void => {
    let babelrcContent: { plugins: string[] };

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
    if (!babelrcContent.plugins.includes(ONLOOK_PLUGIN.WEBPACK)) {
        // Add "@onlook/react" to the plugins array
        babelrcContent.plugins.push(ONLOOK_PLUGIN.WEBPACK);
    }

    // Write the updated content back to the .babelrc file
    fs.writeFileSync(babelrcPath, JSON.stringify(babelrcContent, null, 2), 'utf8');
    console.log('.babelrc has been updated with the "@onlook/react" plugin.');
};
