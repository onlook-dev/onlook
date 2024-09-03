#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

import {
  checkVariableDeclarationExist,
  exists,
  genASTParserOptionsByFileExtension,
  genImportDeclaration,
  hasDependency,
  isSupportFileExtension
} from './utils';

import {
  BUILD_TOOL_NAME,
  CONFIG_FILE_PATTERN,
  DEPENDENCY_NAME,
  NEXTJS_COMMON_FILES,
  NEXTJS_CONFIG_BASE_NAME,
  ONLOOK_NEXTJS_PLUGIN,
} from './constants';

export const isNextJsProject = async (): Promise<boolean> => {
  try {
    const configPath = CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.NEXT];

    // Check if the configuration file exists
    if (!await exists(configPath)) {
      return false;
    }

    // Check if the dependency exists
    if (!await hasDependency(DEPENDENCY_NAME.NEXT)) {
      return false;
    }

    // Check if one of the directories exists
    const directoryExists = await Promise.all(NEXTJS_COMMON_FILES.map(exists));

    return directoryExists.some(Boolean);
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const modifyNextConfig = async (configFileExtension: string): Promise<void> => {
  if (!isSupportFileExtension(configFileExtension)) {
    console.error('Unsupported file extension');
    return;
  }

  const configFileName = `${NEXTJS_CONFIG_BASE_NAME}${configFileExtension}`;

  // Define the path to next.config.* file
  const configPath = path.resolve(process.cwd(), configFileName);

  if (!fs.existsSync(configPath)) {
    console.error(`${configFileName} not found`);
    return;
  }

  console.log(`Adding ${ONLOOK_NEXTJS_PLUGIN} plugin into ${configFileName} file...`);

  // Read the existing next.config.* file
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading ${configPath}:`, err);
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
        properties.forEach(prop => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'experimental' })) {
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
        let swcPluginsProperty: t.ObjectProperty | undefined;

        // Find the swcPlugins property
        experimentalProperties.forEach(prop => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: 'swcPlugins' })) {
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
      const importDeclaration = genImportDeclaration(configFileExtension, 'path');
      importDeclaration && ast.program.body.unshift(importDeclaration);
    }

    // Generate the modified code from the AST
    const updatedCode = generate(ast, {}, data).code;

    // Write the updated content back to next.config.* file
    fs.writeFile(configPath, updatedCode, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing ${configPath}:`, err);
        return;
      }

      console.log(`Successfully updated ${configPath}`);
    });
  });
};
