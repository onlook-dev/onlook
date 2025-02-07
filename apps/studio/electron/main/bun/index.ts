import { exec } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { __dirname } from '../index';
import { replaceCommand } from './parse';

export const getBunExecutablePath = (): string => {
    const platform = process.platform;
    const isProduction = app.isPackaged;
    const binName = platform === 'win32' ? 'bun.exe' : 'bun';

    const bunPath = isProduction
        ? path.join(process.resourcesPath, 'bun', binName)
        : path.join(__dirname, 'resources', 'bun', binName);

    return bunPath;
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
    options: RunBunCommandOptions,
): Promise<{ stdout: string; stderr: string }> => {
    let commandToExecute = command;

    const isMacIntel = process.platform === 'darwin' && process.arch === 'x64';
    if (!isMacIntel) {
        const bunBinary = getBunExecutablePath();
        commandToExecute = replaceCommand(command, bunBinary);
    }

    return new Promise((resolve, reject) => {
        exec(
            commandToExecute,
            {
                cwd: options.cwd,
                env: {
                    ...options.env,
                    ...process.env,
                },
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer to handle larger outputs
            },
            (error: Error | null, stdout: string, stderr: string) => {
                // Call the callbacks with the complete output
                if (stdout && options.callbacks?.onStdout) {
                    options.callbacks.onStdout(stdout);
                }

                if (stderr && options.callbacks?.onStderr) {
                    options.callbacks.onStderr(stderr);
                }

                if (error) {
                    options.callbacks?.onError?.(error);
                    reject(
                        new Error(`Process exited with error: ${error.message}\nStderr: ${stderr}`),
                    );
                    return;
                }

                options.callbacks?.onClose?.(0, null);
                resolve({ stdout, stderr });
            },
        );
    });
};

export const getBunCommand = (command: string): string => {
    const bunExecutable = getBunExecutablePath();
    return replaceCommand(command, bunExecutable);
};
