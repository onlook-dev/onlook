const BUILD_TOOL_NAME = {
  NEXT: "next",
  WEBPACK: "webpack",
  CRA: "cra",
}

const DEPENDENCY_NAME = {
  NEXT: "next",
  WEBPACK: "webpack",
  CRA: "react-scripts",
}

const NEXTJS_CONFIG_BASE_NAME = 'next.config';

const CONFIG_FILE_PATTERN = {
  [BUILD_TOOL_NAME.NEXT]: `${NEXTJS_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.WEBPACK]: 'webpack.config.*',
}

const PACKAGE_JSON = 'package.json';
const YARN_LOCK = 'yarn.lock';
const YARN = 'yarn';
const NPM = 'npm';

const ONLOOK_NEXTJS_PLUGIN = '@onlook/nextjs';
const ONLOOK_WEBPACK_PLUGIN = '@onlook/react';

const NEXTJS_COMMON_FILES = ['pages', 'app', 'src/pages', 'src/app'];

const JS_FILE_EXTENSION = '.js';
const MJS_FILE_EXTENSION = '.mjs';

module.exports = {
  NEXTJS_CONFIG_BASE_NAME,
  BUILD_TOOL_NAME,
  DEPENDENCY_NAME,
  CONFIG_FILE_PATTERN,
  PACKAGE_JSON,
  YARN_LOCK,
  YARN,
  NPM,
  ONLOOK_NEXTJS_PLUGIN,
  ONLOOK_WEBPACK_PLUGIN,
  NEXTJS_COMMON_FILES,
  JS_FILE_EXTENSION,
  MJS_FILE_EXTENSION
};
