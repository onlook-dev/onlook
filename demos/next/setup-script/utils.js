#!/usr/bin/env node
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');
const { YARN, YARN_LOCK, PACKAGE_JSON, NPM } = require('./constants');

// Function to check if a file or directory exists
const exists = async (filePattern) => {
  try {
    const pattern = path.resolve(process.cwd(), filePattern);
    const files = await checkFilesByPattern(pattern);
    return files.length > 0;
  } catch (err) {
    return false
  }
}

// Function to check files by pattern
const checkFilesByPattern = (pattern) => {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
};

// Install npm packages
const installPackages = async (packages) => {
  console.log(`Installing packages: ${packages.join(', ')}`);
  const packageManager = await exists(YARN_LOCK) ? YARN : NPM;
  const command = packageManager === YARN ? 'yarn add -D' : 'npm install --save-dev';
  execSync(`${command} ${packages.join(' ')}`, { stdio: 'inherit' });
};

// Check if a dependency is in package.json
const hasDependency = async (dependencyName) => {
  const packageJsonPath = path.resolve(process.cwd(), PACKAGE_JSON);
  if (await exists(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    return (
      (packageJson.dependencies && packageJson.dependencies[dependencyName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[dependencyName])
    );
  }
  return false;
};

const getFileExtensionByPattern = async (dir, filePattern) => {
  const fullDirPattern = path.resolve(dir, filePattern);
  const files = await checkFilesByPattern(fullDirPattern);

  if (files.length > 0) {
    return path.extname(files[0]);
  }

  return null;
};

module.exports = {
  hasDependency,
  getFileExtensionByPattern,
  exists,
  checkFilesByPattern,
  installPackages
};
