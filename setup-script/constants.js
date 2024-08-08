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
const WEBPACK_CONFIG_BASE_NAME = 'webpack.config';

const CONFIG_FILE_PATTERN = {
  [BUILD_TOOL_NAME.NEXT]: `${NEXTJS_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.WEBPACK]: `${WEBPACK_CONFIG_BASE_NAME}.*`,
}

const PACKAGE_JSON = 'package.json';
const YARN_LOCK = 'yarn.lock';
const YARN = 'yarn';
const NPM = 'npm';

const ONLOOK_NEXTJS_PLUGIN = '@onlook/nextjs';
const ONLOOK_WEBPACK_PLUGIN = '@onlook/react';

const NEXTJS_COMMON_FILES = ['pages', 'app', 'src/pages', 'src/app'];
const CRA_COMMON_FILES = ['public', 'src'];

const CONFIG_OVERRIDES_FILE = 'config-overrides.js';
const BABELRC_FILE = '.babelrc';

const JS_FILE_EXTENSION = '.js';
const MJS_FILE_EXTENSION = '.mjs';

const CRA_DEPENDENCIES = ['@onlook/babel-plugin-react', 'customize-cra', 'react-app-rewired'];

const WEBPACK_DEPENDENCIES = [
  '@onlook/babel-plugin-react',
  'babel-loader',
  '@babel/preset-react',
  '@babel/core',
  '@babel/preset-env',
  'webpack'
];

module.exports = {
  BABELRC_FILE,
  WEBPACK_CONFIG_BASE_NAME,
  WEBPACK_DEPENDENCIES,
  CONFIG_OVERRIDES_FILE,
  CRA_COMMON_FILES,
  CRA_DEPENDENCIES,
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
