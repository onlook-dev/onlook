export enum BUILD_TOOL_NAME {
  NEXT = "next",
  WEBPACK = "webpack",
  CRA = "cra",
  VITE = "vite",
}

export enum DEPENDENCY_NAME {
  NEXT = "next",
  WEBPACK = "webpack",
  CRA = "react-scripts",
  VITE = "vite"
}

export const NEXTJS_CONFIG_BASE_NAME = 'next.config';
export const WEBPACK_CONFIG_BASE_NAME = 'webpack.config';
export const VITEJS_CONFIG_BASE_NAME = 'vite.config';

export const CONFIG_FILE_PATTERN: Record<BUILD_TOOL_NAME, string> = {
  [BUILD_TOOL_NAME.NEXT]: `${NEXTJS_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.WEBPACK]: `${WEBPACK_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.VITE]: `${VITEJS_CONFIG_BASE_NAME}.*`,
  [BUILD_TOOL_NAME.CRA]: ''
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

export const NEXT_DEPENDENCIES = [ONLOOK_NEXTJS_PLUGIN];
export const CRA_DEPENDENCIES = [ONLOOK_BABEL_PLUGIN, 'customize-cra', 'react-app-rewired'];
export const VITE_DEPENDENCIES = [ONLOOK_BABEL_PLUGIN];

export const WEBPACK_DEPENDENCIES = [
  ONLOOK_BABEL_PLUGIN,
  'babel-loader',
  '@babel/preset-react',
  '@babel/core',
  '@babel/preset-env',
  'webpack'
];
