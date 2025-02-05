import { spawn, execFile } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { quote } from 'shell-quote';
import { __dirname } from '../index';
import { parseCommandAndArgs } from './parse';
import { existsSync } from 'fs';
import { access, constants } from 'fs/promises';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function verifyBunExecutable(bunPath: string): Promise<boolean> {
    try {
        const cleanPath = bunPath.replace(/^['"](.+)['"]$/, '$1');

        if (!existsSync(cleanPath)) {
            console.error(`Bun executable not found at: ${cleanPath}`);
            return false;
        }

        await access(cleanPath, constants.X_OK);
        await execFileAsync(cleanPath, ['--version']);

        return true;
    } catch (error) {
        console.error('Bun executable verification failed:', error);
        return false;
    }
}

export const getBunExecutablePath = async (): Promise<string> => {
    const platform = process.platform;
    const isProduction = app.isPackaged;
    const binName = platform === 'win32' ? 'bun.exe' : 'bun';

    const bunPath = isProduction
        ? path.join(process.resourcesPath, 'bun', binName)
        : path.join(__dirname, 'resources', 'bun', binName);

    if (!(await verifyBunExecutable(bunPath))) {
        throw new Error(`Bun executable verification failed at path: ${bunPath}`);
    }

    return quote([bunPath]);
};

export interface RunBunCommandOptions {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    callbacks?: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onClose?: (code: number | null, signal: string | null) => void;
        onError?: (err: Error) => void;
    };
}

export const runBunCommand = async (
    command: string,
    args: string[] = [],
    options: RunBunCommandOptions,
): Promise<{ stdout: string; stderr: string }> => {
    const bunBinary = await getBunExecutablePath();
    const { finalCommand, allArgs } = parseCommandAndArgs(command, args, bunBinary);
    const quotedCommand = quote([finalCommand]);

    return new Promise((resolve, reject) => {
        const spawnProcess = spawn(quotedCommand, allArgs, {
            stdio: 'pipe',
            cwd: options.cwd,
            env: options.env,
        });
        let stdout = '';
        let stderr = '';

        spawnProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            options.callbacks?.onStdout?.(stdout);
        });

        spawnProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            options.callbacks?.onStderr?.(stderr);
        });

        spawnProcess.on('close', (code, signal) => {
            options.callbacks?.onClose?.(code, signal);
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
            }
        });

        spawnProcess.on('error', (err: Error) => {
            options.callbacks?.onError?.(err);
            reject(err);
        });
    });
};

export const getBunCommand = async (command: string, args: string[] = []): Promise<string> => {
    const bunExecutable = await getBunExecutablePath();
    const { finalCommand, allArgs } = parseCommandAndArgs(command, args, bunExecutable);
    return `${finalCommand} ${allArgs.join(' ')}`;
};
