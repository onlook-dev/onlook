import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { __dirname } from '../index';
import { parseCommandAndArgs } from './parse';

export const getBunExecutablePath = () => {
    const platform = process.platform;
    const isProduction = app.isPackaged;
    const binName = platform === 'win32' ? 'bun.exe' : 'bun';

    if (isProduction) {
        return path.join(process.resourcesPath, 'bun', binName);
    } else {
        return path.join(__dirname, 'resources', 'bun', binName);
    }
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

    return new Promise((resolve, reject) => {
        const process = spawn(finalCommand, allArgs, {
            stdio: 'pipe',
            shell: true,
            cwd: options.cwd,
            env: options.env,
        });
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
            options.callbacks?.onStdout?.(stdout);
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
            options.callbacks?.onStderr?.(stderr);
        });

        process.on('close', (code, signal) => {
            options.callbacks?.onClose?.(code, signal);
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
            }
        });

        process.on('error', (err: Error) => {
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
