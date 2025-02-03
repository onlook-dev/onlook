import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { __dirname } from '../index';

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

    runBunCommand(command: string, args: string[] = []) {
        const bunBinary = this.getBunBinaryPath();
        return new Promise((resolve, reject) => {
            const process = spawn(bunBinary, [command, ...args], { stdio: 'pipe' });

            process.stdout?.on('data', (data: Buffer) => {
                console.log(data.toString());
            });

            process.stderr?.on('data', (data: Buffer) => {
                console.error(data.toString());
            });

            process.on('close', (code: number) => {
                if (code === 0) {
                    resolve(void 0);
                } else {
                    reject(new Error(`Command exited with code ${code}`));
                }
            });

            process.on('error', (err: Error) => {
                reject(err);
            });
        });
    }
}

export default BunManager.getInstance();
