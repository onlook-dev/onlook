import { spawn } from 'child_process';

export const runCommand = (
    cwd: string,
    command: string,
): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        const process = spawn(command, { cwd, shell: true });
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
            }
        });
    });
};
