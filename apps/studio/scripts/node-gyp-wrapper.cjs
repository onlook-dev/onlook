#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const electronPath = require('electron');
const args = process.argv.slice(2);

const nodeGypPath = require.resolve('node-gyp/bin/node-gyp.js');
const nodePath = process.execPath;

console.log('Using Node binary:', nodePath);
console.log('Node-gyp path:', nodeGypPath);
console.log('Current working directory:', process.cwd());
console.log('Environment:', {
    npm_config_node_gyp: process.env.npm_config_node_gyp,
    npm_config_build_from_source: process.env.npm_config_build_from_source,
    npm_config_nodedir: process.env.npm_config_nodedir,
    PATH: process.env.PATH
});

if (args[0] === 'npm') {
    // For npm commands, we'll extract the node-gyp related commands
    const npmArgs = args.slice(1);
    if (npmArgs.includes('install') && npmArgs.includes('node-pty')) {
        // Direct node-gyp rebuild for node-pty
        const nodeGypProcess = spawn(nodePath, [nodeGypPath, 'rebuild'], {
            stdio: 'inherit',
            env: {
                ...process.env,
                npm_config_build_from_source: 'true',
                npm_config_node_gyp: nodeGypPath,
                npm_config_nodedir: path.dirname(nodePath)
            },
            cwd: path.join(process.cwd(), 'node_modules', 'node-pty'),
            shell: os.platform() === 'win32'
        });

        nodeGypProcess.on('exit', (code) => {
            process.exit(code ?? 0);
        });
    } else {
        // For other npm commands, use system npm
        const npmProcess = spawn(nodePath, [require.resolve('npm/bin/npm-cli.js'), ...args.slice(1)], {
            stdio: 'inherit',
            env: process.env,
            shell: os.platform() === 'win32'
        });

        npmProcess.on('exit', (code) => {
            process.exit(code ?? 0);
        });
    }
} else {
    // Direct node-gyp commands
    const nodeGypProcess = spawn(nodePath, [nodeGypPath, ...args], {
        stdio: 'inherit',
        env: process.env,
        shell: os.platform() === 'win32'
    });

    nodeGypProcess.on('exit', (code) => {
        process.exit(code ?? 0);
    });
}
