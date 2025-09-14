import baseConfig from "@onlook/eslint/base";
import nextjsConfig, { restrictEnvAccess } from "@onlook/eslint/nextjs";
import reactConfig from "@onlook/eslint/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
