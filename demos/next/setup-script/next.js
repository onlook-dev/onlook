#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const traverse = require('@babel/traverse').default;

const { exists, hasDependency } = require('./utils');
const {
  BUILD_TOOL_NAME,
  DEPENDENCY_NAME,
  CONFIG_FILE_PATTERN,
  NEXTJS_COMMON_FILES,
  NEXTJS_CONFIG_BASE_NAME,
  ONLOOK_NEXTJS_PLUGIN,
  JS_FILE_EXTENSION,
  MJS_FILE_EXTENSION
} = require('./constants');

// Check for common Next.js files and directories
const isNextJsProject = async () => {
  try {
    const configPath = CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.NEXT];

    // Check if the configuration file exists
    if (!await exists(configPath)) {
      return false;
    }

    // Check if the dependency exists
    if (!await hasDependency(DEPENDENCY_NAME.NEXT)) {
      return false
    }

    // Check if one of the directories exists
    const directoryExists = await Promise.all(NEXTJS_COMMON_FILES.map(exists));

    return directoryExists.some(Boolean);
  } catch (err) {
    console.error(err);
    return false;
  }

}

const modifyNextConfig = async (configFileExtension) => {
  if (!configFileExtension || [JS_FILE_EXTENSION, MJS_FILE_EXTENSION].indexOf(configFileExtension) === -1) {
    console.error('Unsupported file extension');
    return;
  }

  const configFileName = `${NEXTJS_CONFIG_BASE_NAME}${configFileExtension}`;
  console.log(`Adding ${ONLOOK_NEXTJS_PLUGIN} plugin into ${configFileName} file...`);
  // Define the path to next.config.* file
  const configPath = path.resolve(process.cwd(), configFileName);

  // Read the existing next.config.* file
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading ${configPath}:`, err);
      return;
    }

    // Generate the AST parser options based on the file extension
    const astParserOption =
      configFileExtension === MJS_FILE_EXTENSION
        ? {
          sourceType: 'module',
          plugins: ['jsx']
        } : { sourceType: 'script' };

    // Parse the file content to an AST
    const ast = parser.parse(data, astParserOption);

    let hasPathImport = false;

    // Traverse the AST to find the experimental.swcPlugins array
    traverse(ast, {
      VariableDeclarator(path) {
        // check if path is imported in js file
        if (
          t.isIdentifier(path.node.id, { name: 'path' }) &&
          t.isCallExpression(path.node.init) &&
          path.node.init.callee.name === 'require' &&
          path.node.init.arguments[0].value === 'path'
        ) {
          hasPathImport = true;
        }
      },
      ImportDeclaration(path) {
        // check if path is imported in mjs file
        if (path.node.source.value === 'path') {
          hasPathImport = true;
        }
      },
      ObjectExpression(path) {
        const properties = path.node.properties;
        let experimentalProperty;

        // Find the experimental property
        properties.forEach(prop => {
          if (t.isIdentifier(prop.key, { name: 'experimental' })) {
            experimentalProperty = prop;
          }
        });

        if (!experimentalProperty) {
          // If experimental property is not found, create it
          experimentalProperty = t.objectProperty(
            t.identifier('experimental'),
            t.objectExpression([])
          );
          properties.push(experimentalProperty);
        }

        // Ensure experimental is an ObjectExpression
        if (!t.isObjectExpression(experimentalProperty.value)) {
          experimentalProperty.value = t.objectExpression([]);
        }

        const experimentalProperties = experimentalProperty.value.properties;
        let swcPluginsProperty;

        // Find the swcPlugins property
        experimentalProperties.forEach(prop => {
          if (t.isIdentifier(prop.key, { name: 'swcPlugins' })) {
            swcPluginsProperty = prop;
          }
        });

        if (!swcPluginsProperty) {
          // If swcPlugins property is not found, create it
          swcPluginsProperty = t.objectProperty(
            t.identifier('swcPlugins'),
            t.arrayExpression([])
          );
          experimentalProperties.push(swcPluginsProperty);
        }

        // Ensure swcPlugins is an ArrayExpression
        if (!t.isArrayExpression(swcPluginsProperty.value)) {
          swcPluginsProperty.value = t.arrayExpression([]);
        }

        // Add the new plugin configuration to swcPlugins array
        const pluginConfig = t.arrayExpression([
          t.stringLiteral(ONLOOK_NEXTJS_PLUGIN),
          t.objectExpression([
            t.objectProperty(
              t.identifier('root'),
              t.callExpression(t.memberExpression(t.identifier('path'), t.identifier('resolve')), [t.stringLiteral('.')])
            )
          ])
        ]);

        swcPluginsProperty.value.elements.push(pluginConfig);

        // Stop traversing after the modification
        path.stop();
      }
    });

    // If 'path' is not imported, add the import statement
    if (!hasPathImport) {
      // Add the import statement at the beginning of the mjs file
      const importDeclaration = t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier('path'))],
        t.stringLiteral('path')
      );
      // Add the require statement at the beginning of the js file
      const requireDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('path'),
          t.callExpression(t.identifier('require'), [t.stringLiteral('path')])
        )
      ]);
      ast.program.body.unshift(configFileExtension === JS_FILE_EXTENSION ? requireDeclaration : importDeclaration);
    }

    // Generate the modified code from the AST
    const newCode = generate(ast, {}, data).code;

    // Write the updated content back to next.config.mjs
    fs.writeFile(configPath, newCode, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing ${configPath}:`, err);
        return;
      }

      console.log(`Successfully updated ${configPath}`);
    });
  });
}

module.exports = {
  modifyNextConfig,
  isNextJsProject
};
