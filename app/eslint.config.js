export default [
    {
        ignores: [
            'node_modules/',
            'dist/',
            'dist-electron/',
            'release/',
            'src/out/',
            'electron/preload/webview/changes/csstree.esm.js',
        ],
    },
    {

        rules: {
            curly: ['error', 'all'],
            "prefer-const": "error"
        },
    },
];
