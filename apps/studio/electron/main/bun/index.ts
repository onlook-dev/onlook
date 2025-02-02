import { download } from '@electron/get';
import { spawn } from 'child_process';
import { app } from 'electron';
import extract from 'extract-zip';
import fs from 'fs';
import path from 'path';

// https://bun.sh/docs/installation#downloading-bun-binaries-directly
const BUN_VERSION = '1.2.2';
const BUN_URLS: Partial<Record<NodeJS.Platform, Partial<Record<NodeJS.Architecture, string>>>> = {
    win32: {
        x64: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-windows-x64.zip`,
        arm64: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-windows-aarch64.zip`,
    },
    darwin: {
        x64: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-darwin-x64.zip`,
        arm64: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-darwin-aarch64.zip`,
    },
    linux: {
        x64: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip`,
        arm64: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-aarch64.zip`,
    },
};

class BunManager {
    private static instance: BunManager;

    private constructor() {}

    public static getInstance(): BunManager {
        if (!BunManager.instance) {
            BunManager.instance = new BunManager();
        }
        return BunManager.instance;
    }

    getBunBinaryPath() {
        const platform = process.platform;
        const isProduction = app.isPackaged;
        const binName = platform === 'win32' ? 'bun.exe' : 'bun';

        if (isProduction) {
            return path.join(process.resourcesPath, 'bun', binName);
        } else {
            return path.join(__dirname, 'resources', 'bun', binName);
        }
    }

    // Download and set up Bun binary
    async setupBunBinary() {
        const platform = process.platform as NodeJS.Platform;
        const arch = process.arch as NodeJS.Architecture;

        if (!BUN_URLS[platform] || !BUN_URLS[platform][arch]) {
            throw new Error(`Unsupported platform: ${platform} ${arch}`);
        }

        const bunUrl = BUN_URLS[platform]![arch]!;
        const bunPath = path.join(app.getPath('userData'), 'bun');

        // Create bun directory if it doesn't exist
        if (!fs.existsSync(bunPath)) {
            fs.mkdirSync(bunPath, { recursive: true });
        }

        // Download and extract Bun binary
        try {
            const zipPath = await download(bunUrl, {
                downloadOptions: {
                    quiet: true,
                },
            });

            // Extract zip file
            await extract(zipPath, { dir: bunPath });

            // Make binary executable on Unix systems
            if (platform !== 'win32') {
                const binPath = this.getBunBinaryPath();
                fs.chmodSync(binPath, '755');
            }
        } catch (error) {
            console.error('Failed to download Bun:', error);
            throw error;
        }
    }

    // Execute a Bun script
    runBunScript(scriptPath: string, args: string[] = []) {
        const bunBinary = this.getBunBinaryPath();

        return new Promise((resolve, reject) => {
            const process = spawn(bunBinary, [scriptPath, ...args], {
                stdio: 'inherit',
            });

            process.on('close', (code: number) => {
                if (code === 0) {
                    resolve(void 0);
                } else {
                    reject(new Error(`Script exited with code ${code}`));
                }
            });

            process.on('error', (err: Error) => {
                reject(err);
            });
        });
    }
}

export default BunManager.getInstance();
