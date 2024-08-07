#!/usr/bin/env node
const { installPackages, getFileExtensionByPattern } = require('./utils');
const {
  ONLOOK_NEXTJS_PLUGIN,
  CONFIG_FILE_PATTERN,
  BUILD_TOOL_NAME,
  CRA_DEPENDENCIES,
  WEBPACK_DEPENDENCIES
} = require('./constants');
const { isNextJsProject, modifyNextConfig } = require('./next');
const { isCRAProject, ensureConfigOverrides, modifyStartScript } = require('./create-react-app');
const { isWebpackProject, modifyWebpackConfig, modifyBabelrc } = require('./webpack');


const setup = async () => {
  try {
    if (await isNextJsProject()) {
      console.log('This is a Next.js project.');
      await installPackages([ONLOOK_NEXTJS_PLUGIN]);
      const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.NEXT]);
      modifyNextConfig(configFileExtension);
      return;
    }

    if (await isCRAProject()) {
      console.log('This is a create-react-app project.');
      await installPackages(CRA_DEPENDENCIES);
      ensureConfigOverrides()
      modifyStartScript()
      return;
    }

    if (await isWebpackProject()) {
      console.log('This is a webpack project.');
      await installPackages(WEBPACK_DEPENDENCIES);
      const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.WEBPACK]);
      modifyWebpackConfig(configFileExtension);
      modifyBabelrc();
      return;
    }

    console.warn('Cannot determine the project framework.');

  } catch (err) {
    console.error(err);
  }
};

setup();
