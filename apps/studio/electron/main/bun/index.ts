import { execSync } from 'child_process';
import { app } from 'electron';
import path from 'path';
import { __dirname } from '../index';
import { replaceCommand } from './parse';

export const getBunExecutablePath = (): string => {
    const arch = process.arch === 'arm64' ? 'aarch64' : process.arch;
    const isProduction = app.isPackaged;
    const binName = process.platform === 'win32' ? `bun.exe` : `bun-${arch}`;

    const bunPath = isProduction
        ? path.join(process.resourcesPath, 'bun', binName)
        : path.join(__dirname, 'resources', 'bun', binName);

    return bunPath;
};

export interface RunBunCommandOptions {
    cwd: string;
    env?: NodeJS.ProcessEnv;
}

export interface RunBunCommandResult {
    success: boolean;
    error?: string;
    output?: string;
}

export async function runBunCommand(
    command: string,
    options: RunBunCommandOptions,
): Promise<RunBunCommandResult> {
    try {
        const commandToExecute = getBunCommand(command);
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

        const buffer = execSync(commandToExecute, {
            cwd: options.cwd,
            env: {
                ...options.env,
                ...process.env,
            },
            maxBuffer: 1024 * 1024 * 10,
            shell,
        });

        return { success: true, output: buffer.toString() };
    } catch (error) {
        console.error(error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export const getBunCommand = (command: string): string => {
    const bunExecutable = getBunExecutablePath();
    return replaceCommand(command, bunExecutable);
};
