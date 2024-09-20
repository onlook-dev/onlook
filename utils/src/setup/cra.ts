import { CONFIG_OVERRIDES_FILE, CRA_COMMON_FILES, DEPENDENCY_NAME, JS_FILE_EXTENSION, ONLOOK_WEBPACK_PLUGIN, PACKAGE_JSON } from "./constants";
import { exists, genASTParserOptionsByFileExtension, hasDependency } from "./utils";

import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

const configOverridesPath = path.resolve(CONFIG_OVERRIDES_FILE);
const packageJsonPath = path.resolve(PACKAGE_JSON);

const requiredImportSource = 'customize-cra';

// Define the content to be added if the file does not exist
const defaultContent = `
    const { override, addBabelPlugins } = require('${requiredImportSource}');

    module.exports = override(
        ...addBabelPlugins(
            '${ONLOOK_WEBPACK_PLUGIN}'
        )
    );
`;

export const ensureConfigOverrides = (): void => {
    // Handle the case when the file does not exist
    if (!fs.existsSync(configOverridesPath)) {
        fs.writeFileSync(configOverridesPath, defaultContent, 'utf8');
        console.log(`${CONFIG_OVERRIDES_FILE} has been created with the necessary config.`);
        return;
    }

    // Handle the case when the file exists
    fs.readFile(configOverridesPath, 'utf8', (err, fileContent) => {
        if (err) {
            console.error(`Error reading ${configOverridesPath}:`, err);
            return;
        }
        // Read the existing file
        const ast = parse(fileContent, genASTParserOptionsByFileExtension(JS_FILE_EXTENSION));

        let hasCustomizeCraImport = false;
        let hasOnlookReactPlugin = false;

        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === requiredImportSource) {
                    hasCustomizeCraImport = true;
                }
            },
            VariableDeclarator(path) {
                if (t.isCallExpression(path.node.init) &&
                    t.isIdentifier(path.node.init.callee, { name: 'require' }) &&
                    path.node.init.arguments.length === 1 &&
                    t.isStringLiteral(path.node.init.arguments[0], { value: requiredImportSource })) {
                    hasCustomizeCraImport = true;
                }
            },
            CallExpression(path) {
                if (t.isIdentifier(path.node.callee, { name: 'override' })) {
                    path.node.arguments.forEach(arg => {
                        if (t.isSpreadElement(arg) && t.isCallExpression(arg.argument) &&
                            t.isIdentifier(arg.argument.callee, { name: 'addBabelPlugins' }) &&
                            arg.argument.arguments.some(pluginArg => t.isStringLiteral(pluginArg, { value: ONLOOK_WEBPACK_PLUGIN }))) {
                            hasOnlookReactPlugin = true;
                        }
                    });
                }
            }
        });

        if (!hasCustomizeCraImport) {
            const requireDeclaration = t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.objectPattern([
                        t.objectProperty(t.identifier('override'), t.identifier('override')),
                        t.objectProperty(t.identifier('addBabelPlugins'), t.identifier('addBabelPlugins'))
                    ]),
                    t.callExpression(t.identifier('require'), [t.stringLiteral(requiredImportSource)])
                )
            ]);
            ast.program.body.unshift(requireDeclaration);
        }

        if (!hasOnlookReactPlugin) {
            traverse(ast, {
                AssignmentExpression(path) {
                    if (t.isMemberExpression(path.node.left) &&
                        t.isIdentifier(path.node.left.object, { name: 'module' }) &&
                        t.isIdentifier(path.node.left.property, { name: 'exports' })) {
                        // @ts-ignore
                        path.node.right.arguments.push(
                            t.spreadElement(t.callExpression(t.identifier('addBabelPlugins'), [
                                t.stringLiteral(ONLOOK_WEBPACK_PLUGIN)
                            ]))
                        );
                    }
                }
            });
        }

        const updatedCode = generate(ast, {}, fileContent).code;
        // Write the updated content back to next.config.* file
        fs.writeFile(configOverridesPath, updatedCode, 'utf8', (err) => {
            if (err) {
                console.error(`Error writing ${configOverridesPath}:`, err);
                return;
            }

            console.log(`Successfully updated ${configOverridesPath}`);
        });
    });
};

export const isCRAProject = async (): Promise<boolean> => {
    try {
        // Check if the dependency exists
        if (!await hasDependency(DEPENDENCY_NAME.CRA)) {
            return false;
        }

        // Check if one of the directories exists
        const directoryExists = await Promise.all(CRA_COMMON_FILES.map(exists));

        return directoryExists.some(Boolean);
    } catch (err) {
        console.error(err);
        return false;
    }
};

export const modifyStartScript = (): void => {
    fs.readFile(packageJsonPath, 'utf8', (err, fileContent) => {
        if (err) {
            console.error('Error reading package.json:', err);
            return;
        }

        const packageJSON = JSON.parse(fileContent);
        if (!packageJSON.scripts) {
            packageJSON.scripts = {};
        }

        const scriptsToUpdate = ['start', 'test', 'build'];

        scriptsToUpdate.forEach(script => {
            if (!packageJSON.scripts[script]) {
                packageJSON.scripts[script] = `react-app-rewired ${script}`;
            } else {
                packageJSON.scripts[script] = packageJSON.scripts[script].replace(/react-scripts/, 'react-app-rewired');
            }
        });

        fs.writeFile('package.json', JSON.stringify(packageJSON, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing package.json:', err);
                return;
            }

            console.log('Successfully updated the start script in package.json');
        });
    });
};
