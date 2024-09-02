export const BUILD_TOOL_NAME = {
  NEXT: "next",
  WEBPACK: "webpack",
  CRA: "cra",
  VITE: "vite",
}

export const DEPENDENCY_NAME = {
  NEXT: "next",
  WEBPACK: "webpack",
  CRA: "react-scripts",
  VITE: "vite"
}

export const NEXTJS_CONFIG_BASE_NAME = 'next.config';
export const WEBPACK_CONFIG_BASE_NAME = 'webpack.config';
export const VITEJS_CONFIG_BASE_NAME = 'vite.config';

export const CONFIG_FILE_PATTERN = {
  [BUILD_TOOL_NAME.NEXT]: `${NEXTJS_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.WEBPACK]: `${WEBPACK_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.VITE]: `${VITEJS_CONFIG_BASE_NAME}.*`,
}

export const PACKAGE_JSON = 'package.json';
export const YARN_LOCK = 'yarn.lock';
export const YARN = 'yarn';
export const NPM = 'npm';

export const ONLOOK_NEXTJS_PLUGIN = '@onlook/nextjs';
export const ONLOOK_WEBPACK_PLUGIN = '@onlook/react';
export const ONLOOK_BABEL_PLUGIN = '@onlook/babel-plugin-react';

export const NEXTJS_COMMON_FILES = ['pages', 'app', 'src/pages', 'src/app'];
export const CRA_COMMON_FILES = ['public', 'src'];

export const CONFIG_OVERRIDES_FILE = 'config-overrides.js';
export const BABELRC_FILE = '.babelrc';

export const JS_FILE_EXTENSION = '.js';
export const MJS_FILE_EXTENSION = '.mjs';
export const TS_FILE_EXTENSION = '.ts';

export const CRA_DEPENDENCIES = ['@onlook/babel-plugin-react', 'customize-cra', 'react-app-rewired'];
export const VITE_DEPENDENCIES = ['@onlook/babel-plugin-react'];

export const WEBPACK_DEPENDENCIES = [
  '@onlook/babel-plugin-react',
  'babel-loader',
  '@babel/preset-react',
  '@babel/core',
  '@babel/preset-env',
  'webpack'
];
