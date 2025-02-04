import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { quote } from 'shell-quote';
import { __dirname } from '../index';
import { parseCommandAndArgs } from './parse';

export const getBunExecutablePath = (): string => {
    const platform = process.platform;
    const isProduction = app.isPackaged;
    const binName = platform === 'win32' ? 'bun.exe' : 'bun';

    const bunPath = isProduction
        ? path.join(process.resourcesPath, 'bun', binName)
        : path.join(__dirname, 'resources', 'bun', binName);

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

export const runBunCommand = (
    command: string,
    args: string[] = [],
    options: RunBunCommandOptions,
): Promise<{ stdout: string; stderr: string }> => {
    const bunBinary = getBunExecutablePath();
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

export const getBunCommand = (command: string, args: string[] = []) => {
    const bunExecutable = getBunExecutablePath();
    const { finalCommand, allArgs } = parseCommandAndArgs(command, args, bunExecutable);
    return `${finalCommand} ${allArgs.join(' ')}`;
};
