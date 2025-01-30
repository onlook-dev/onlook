#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const electronPath = require('electron');
const args = process.argv.slice(2);

const { spawn } = require('child_process');
const path = require('path');
const nodeGypPath = require.resolve('node-gyp/bin/node-gyp.js');
const nodePath = process.execPath;
const nodeDir = path.dirname(path.dirname(nodePath));

// Set up environment for node-gyp
const env = {
    ...process.env,
    npm_config_node_gyp: nodeGypPath,
    npm_config_build_from_source: 'true',
    npm_config_nodedir: nodeDir,
    NODEJS_ORG_MIRROR: 'https://nodejs.org/download/release'
};

console.log('Using Node binary:', nodePath);
console.log('Node-gyp path:', nodeGypPath);
console.log('Node directory:', nodeDir);
console.log('Current working directory:', process.cwd());

const args = process.argv.slice(2);
if (args[0] === 'npm') {
    // For npm commands, use node-gyp directly for rebuilding
    const nodeGypProcess = spawn(nodePath, [nodeGypPath, 'rebuild'], {
        stdio: 'inherit',
        env,
        cwd: path.join(process.cwd(), 'node_modules', 'node-pty')
    });

    nodeGypProcess.on('exit', (code) => process.exit(code ?? 0));
} else {
    // For direct node-gyp commands
    const nodeGypProcess = spawn(nodePath, [nodeGypPath, ...args], {
        stdio: 'inherit',
        env
    });

    nodeGypProcess.on('exit', (code) => process.exit(code ?? 0));
}

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
