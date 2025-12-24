// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import baseConfig from "@onlook/eslint/base";
import nextjsConfig, { restrictEnvAccess } from "@onlook/eslint/nextjs";
import reactConfig from "@onlook/eslint/react";

/** @type {import('typescript-eslint').Config} */
export default [{
  ignores: [".next/**"],
}, ...baseConfig, ...reactConfig, ...nextjsConfig, ...restrictEnvAccess, ...storybook.configs["flat/recommended"]];
