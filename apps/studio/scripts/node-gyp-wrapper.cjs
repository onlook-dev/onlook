#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const electronPath = require('electron');

const nodeGypPath = require.resolve('node-gyp/bin/node-gyp.js');
const nodeDir = path.dirname(path.dirname(process.execPath));

const env = {
    ...process.env,
    npm_config_node_gyp: nodeGypPath,
    npm_config_build_from_source: 'true',
    npm_config_nodedir: nodeDir,
    NODEJS_ORG_MIRROR: 'https://nodejs.org/download/release'
};

console.log('Using Node binary:', process.execPath);
console.log('Node-gyp path:', nodeGypPath);
console.log('Node directory:', nodeDir);
console.log('Current working directory:', process.cwd());

const args = process.argv.slice(2);
if (args[0] === 'npm') {
    const npmArgs = args.slice(1);
    if (npmArgs.includes('install') && npmArgs.includes('node-pty')) {
        const nodeGypProcess = spawn(process.execPath, [nodeGypPath, 'rebuild'], {
            stdio: 'inherit',
            env,
            cwd: path.join(process.cwd(), 'node_modules', 'node-pty'),
            shell: os.platform() === 'win32'
        });
        nodeGypProcess.on('exit', (code) => process.exit(code ?? 0));
    } else {
        const npmProcess = spawn(process.execPath, [require.resolve('npm/bin/npm-cli.js'), ...npmArgs], {
            stdio: 'inherit',
            env,
            shell: os.platform() === 'win32'
        });
        npmProcess.on('exit', (code) => process.exit(code ?? 0));
    }
} else {
    const nodeGypProcess = spawn(process.execPath, [nodeGypPath, ...args], {
        stdio: 'inherit',
        env,
        shell: os.platform() === 'win32'
    });
    nodeGypProcess.on('exit', (code) => process.exit(code ?? 0));
}
