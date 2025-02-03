import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { __dirname } from '../index';
import { parseCommandAndArgs } from './helper';

class BunManager {
    private static instance: BunManager;

    private constructor() {}

    public static getInstance(): BunManager {
        if (!BunManager.instance) {
            BunManager.instance = new BunManager();
        }
        return BunManager.instance;
    }

    getExecutablePath() {
        const platform = process.platform;
        const isProduction = app.isPackaged;
        const binName = platform === 'win32' ? 'bun.exe' : 'bun';

        if (isProduction) {
            return path.join(process.resourcesPath, 'bun', binName);
        } else {
            return path.join(__dirname, 'resources', 'bun', binName);
        }
    }

    runCommand(
        command: string,
        args: string[] = [],
        options: { cwd: string } = { cwd: process.cwd() },
    ) {
        const bunBinary = this.getExecutablePath();
        const { finalCommand, allArgs } = parseCommandAndArgs(command, args, bunBinary);

        console.log('[BunManager] Executing:', {
            command: finalCommand,
            arguments: allArgs,
            workingDir: options.cwd,
        });

        return new Promise((resolve, reject) => {
            const process = spawn(finalCommand, allArgs, {
                stdio: 'pipe',
                shell: true,
                cwd: options.cwd,
            });
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log('stdout', stdout);
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('stderr', stderr);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
                }
            });

            process.on('error', (err: Error) => {
                reject(err);
            });
        });
    }
}

export const bun = BunManager.getInstance();
