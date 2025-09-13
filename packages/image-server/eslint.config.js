import baseConfig from "@onlook/eslint/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["test/images/**"],
  },
  ...baseConfig,
];