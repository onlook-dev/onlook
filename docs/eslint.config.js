import baseConfig from "@onlook/eslint/base";
import nextjsConfig from "@onlook/eslint/nextjs";
import reactConfig from "@onlook/eslint/react";

export default [
    {
        ignores: [".next/**", "tsconfig.tsbuildinfo", ".source/**"],
    },
    ...baseConfig,
    ...reactConfig,
    ...nextjsConfig,
];