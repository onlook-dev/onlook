#!/usr/bin/env node

const { installPackages, getFileExtensionByPattern } = require('./utils');
const { ONLOOK_NEXTJS_PLUGIN, CONFIG_FILE_PATTERN, BUILD_TOOL_NAME } = require('./constants');
const { isNextJsProject, modifyNextConfig } = require('./next');


// Main function
const setup = async () => {
  try {
    if (await isNextJsProject()) {
      console.log('This is a NextJs project.');
      installPackages([ONLOOK_NEXTJS_PLUGIN]);
      const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.NEXT]);
      modifyNextConfig(configFileExtension);
      return;
    }
    console.log('This is not a NextJs project.');
  } catch (err) {
    console.error(err);
  }
};

setup();
