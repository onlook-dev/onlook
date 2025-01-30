#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const electronPath = require('electron');
const args = process.argv.slice(2);

if (args[0] === 'npm') {
    const electronNodePath = path.join(
        path.dirname(require.resolve('electron')),
        'dist',
        os.platform() === 'win32' ? 'node.exe' : 'node'
    );
    const nodeProcess = spawn(electronNodePath, args.slice(1), {
        stdio: 'inherit',
        env: process.env,
        shell: os.platform() === 'win32'
    });

    nodeProcess.on('exit', (code) => {
        process.exit(code ?? 0);
    });
} else {
    const nodeGypPath = require.resolve('node-gyp/bin/node-gyp.js');
    const nodeGypProcess = spawn(process.execPath, [nodeGypPath, ...args], {
        stdio: 'inherit',
        env: process.env,
        shell: os.platform() === 'win32'
    });

    nodeGypProcess.on('exit', (code) => {
        process.exit(code ?? 0);
    });
}
