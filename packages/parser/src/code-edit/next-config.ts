import { CUSTOM_OUTPUT_DIR, JS_FILE_EXTENSIONS } from '@onlook/constants';
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
            // Check if this ObjectExpression is part of an export or variable declaration
            // related to 'nextConfig'. This is a heuristic to find the main config object.
            let isConfigObject = false;

            // Skip objects that are property values (like options: {})
            if (t.isObjectProperty(path.parent) && path.parent.value === path.node) {
                return;
            }

            //
            // case: `module.exports = { ... }`
            //
            if (
                t.isAssignmentExpression(path.parent) &&
                t.isMemberExpression(path.parent.left) &&
                t.isIdentifier(path.parent.left.object, { name: 'module' }) &&
                t.isIdentifier(path.parent.left.property, { name: 'exports' })
            ) {
                isConfigObject = true;
            }

            //
            // case: `export default { ... }`
            //
            if (t.isExportDefaultDeclaration(path.parent)) {
                isConfigObject = true;
            }

            //
            // case: `const nextConfig = { ... }` or `const somethingElse = { ... }`
            //
            if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
                // More specific check - look for common Next.js config variable names
                const varName = path.parent.id.name.toLowerCase();
                if (
                    varName.includes('config') ||
                    varName === 'somethingelse' ||
                    varName.includes('next')
                ) {
                    isConfigObject = true;
                }
            }

            //
            // case: `module.exports = () => { return { ... } }`
            //
            if (t.isReturnStatement(path.parent)) {
                // This is a bit of a weak check, but should work for most cases.
                isConfigObject = true;
            }

            //
            // case: `module.exports = withSomePlugin({ ... })`
            //
            if (t.isCallExpression(path.parent) && t.isIdentifier(path.parent.callee)) {
                // Only treat as config object if this is the first argument to the call
                // and this call is being assigned/exported (not a nested plugin setup)
                if (path.parent.arguments[0] === path.node) {
                    // Check if this call is being exported or assigned to module.exports
                    if (
                        t.isAssignmentExpression(path.parentPath?.parent) ||
                        t.isExportDefaultDeclaration(path.parentPath?.parent)
                    ) {
                        isConfigObject = true;
                    }
                }
            }

            if (!isConfigObject) {
                return; // Not the config object, skip.
            }

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

const addEslintConfig = (ast: T.File): boolean => {
    return addConfigProperty(
        ast,
        'eslint',
        t.objectExpression([
            t.objectProperty(t.identifier('ignoreDuringBuilds'), t.booleanLiteral(true)),
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
        const eslintExists = addEslintConfig(ast);

        // Generate the modified code from the AST
        const updatedCode = generate(
            ast,
            {
                retainLines: true,
                compact: false,
            },
            data,
        ).code;

        const success = await fileOps.writeFile(configPath, updatedCode);

        if (!success) {
            console.error(`Error writing ${configPath}`);
            return false;
        }

        console.log(
            `Successfully updated ${configPath} with standalone output, typescript configuration, eslint configuration, and distDir`,
        );
        return outputExists && typescriptExists && distDirExists && eslintExists;
    } catch (error) {
        console.error(`Error processing ${configPath}:`, error);
        return false;
    }
};
