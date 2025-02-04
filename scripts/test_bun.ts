import { platform, arch } from 'os';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { stat } from 'fs/promises';

async function validateBinaryPermissions(path: string): Promise<boolean> {
    try {
        const stats = await stat(path);
        return (stats.mode & 0o111) !== 0;
    } catch {
        return false;
    }
}

async function testBunBinary() {
    const PLATFORM = platform() === 'win32' ? 'win64' : platform();
    const ARCH_TYPE = arch() === 'x64' ? 'x64' : 'aarch64';
    const RESOURCES_DIR = resolve(process.cwd(), 'apps', 'studio', 'resources', 'bun');
    const BUN_EXECUTABLE = join(RESOURCES_DIR, PLATFORM === 'win64' ? 'bun.exe' : 'bun');

    console.log(`Platform: ${PLATFORM}, Architecture: ${ARCH_TYPE}`);
    console.log(`Testing Bun binary at: ${BUN_EXECUTABLE}`);

    // Validate binary permissions on non-Windows platforms
    if (PLATFORM !== 'win64') {
        const isExecutable = await validateBinaryPermissions(BUN_EXECUTABLE);
        if (!isExecutable) {
            throw new Error(`Bun binary at ${BUN_EXECUTABLE} is not executable`);
        }
    }

    return new Promise<void>((resolve, reject) => {
        const bunProcess = spawn(BUN_EXECUTABLE, ['--version'], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        bunProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        bunProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        bunProcess.on('error', (error) => {
            reject(new Error(`Failed to execute bun: ${error.message}`));
        });

        bunProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`Bun version: ${output.trim()}`);
                console.log('Binary test successful');
                resolve();
            } else {
                reject(new Error(`Bun binary test failed with code ${code}\nError: ${errorOutput}`));
            }
        });
    });
}

// First download bun, then test it
import('./download_bun.ts')
    .then(() => testBunBinary())
    .catch((error) => {
        console.error('Failed to download or test bun:', error);
        process.exit(1);
    });
