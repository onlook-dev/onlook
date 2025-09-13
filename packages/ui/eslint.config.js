import baseConfig from "@onlook/eslint/base";
import reactConfig from "@onlook/eslint/react";

/** @type {import('typescript-eslint').Config} */
export default [
  ...baseConfig,
  ...reactConfig,
];