import { spawn } from 'child_process';

export const runCommand = (
    cwd: string,
    command: string,
    env?: Record<string, string>,
): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(command, {
            cwd,
            shell: true,
            env: env ? { ...process.env, ...env } : process.env,
        });
        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });

        childProcess.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        childProcess.on('close', (code: number) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
            }
        });
    });
};
