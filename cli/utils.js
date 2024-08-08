#!/usr/bin/env node
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');
const {
  YARN,
  YARN_LOCK,
  PACKAGE_JSON,
  NPM,
  JS_FILE_EXTENSION,
  MJS_FILE_EXTENSION
} = require('./constants');
const t = require('@babel/types');

/**
 * Check if a file exists
 * 
 * @param {string} filePattern
 * @returns 
 */
const exists = async (filePattern) => {
  try {
    const pattern = path.resolve(process.cwd(), filePattern);
    const files = getFileNamesByPattern(pattern);
    return files.length > 0;
  } catch (err) {
    console.error(err);
    return false
  }
}

/**
 * Get file names by pattern
 * 
 * @param {string} pattern
 * @returns 
 */
const getFileNamesByPattern = (pattern) => glob.globSync(pattern)


/**
 * Install packages
 * 
 * @param {string[]} packages 
 */
const installPackages = async (packages) => {
  console.log(`Installing packages: ${packages.join(', ')}`);
  const packageManager = await exists(YARN_LOCK) ? YARN : NPM;
  const command = packageManager === YARN ? 'yarn add -D' : 'npm install --save-dev';
  execSync(`${command} ${packages.join(' ')}`, { stdio: 'inherit' });
};

/**
 * Check if a dependency exists in package.json
 * 
 * @param {string} dependencyName
 * @returns
 */
const hasDependency = async (dependencyName) => {
  const packageJsonPath = path.resolve(PACKAGE_JSON);
  if (await exists(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    return (
      (packageJson.dependencies && packageJson.dependencies[dependencyName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[dependencyName])
    );
  }
  return false;
};

/**
 * Get file extension by pattern
 * 
 * @param {string} dir 
 * @param {string} filePattern 
 * @returns 
 */
const getFileExtensionByPattern = async (dir, filePattern) => {
  const fullDirPattern = path.resolve(dir, filePattern);
  const files = await getFileNamesByPattern(fullDirPattern);

  if (files.length > 0) {
    return path.extname(files[0]);
  }

  return null;
};

/**
 * Generate AST parser options by file extension
 * 
 * @param {string} fileExtension 
 * @returns 
 */
const genASTParserOptionsByFileExtension = (fileExtension) => {
  switch (fileExtension) {
    case JS_FILE_EXTENSION:
      return {
        sourceType: 'script'
      };
    case MJS_FILE_EXTENSION:
      return {
        sourceType: 'module',
        plugins: ['jsx']
      };
    default:
      return {};
  }
}

/**
 * Generate import declaration
 * 
 * @param {string} fileExtension 
 * @param {string} dependency 
 * @returns 
 */
const genImportDeclaration = (fileExtension, dependency) => {
  switch (fileExtension) {
    case JS_FILE_EXTENSION:
      return t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(dependency),
          t.callExpression(t.identifier('require'), [t.stringLiteral(dependency)])
        )
      ]);
    case MJS_FILE_EXTENSION:
      return t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier(dependency))],
        t.stringLiteral(dependency)
      );
    default:
      return null;
  }
}

/**
 * Check if the variable declaration exists
 * 
 * @param {string} path
 * @param {string} dependency
 * @returns 
 */
const checkVariableDeclarationExist = (path, dependency) => {
  return t.isIdentifier(path.node.id, { name: dependency }) &&
    t.isCallExpression(path.node.init) &&
    path.node.init.callee.name === 'require' &&
    path.node.init.arguments[0].value === dependency
}

const isSupportFileExtension = (fileExtension) => {
  return [JS_FILE_EXTENSION, MJS_FILE_EXTENSION].indexOf(fileExtension) !== -1;
}

module.exports = {
  isSupportFileExtension,
  hasDependency,
  getFileExtensionByPattern,
  exists,
  getFileNamesByPattern,
  installPackages,
  genASTParserOptionsByFileExtension,
  genImportDeclaration,
  checkVariableDeclarationExist
};
