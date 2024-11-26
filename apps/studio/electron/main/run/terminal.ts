import { MainChannels } from '@onlook/models/constants';
import { ChildProcess, spawn } from 'child_process';
import os from 'os';
import { mainWindow } from '..';

class TerminalManager {
    private static instance: TerminalManager;
    private processes: Map<string, ChildProcess>;
    private outputHistory: Map<string, string>;

    private constructor() {
        this.processes = new Map();
        this.outputHistory = new Map();
    }

    static getInstance(): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }

    create(id: string, options?: { cwd?: string }): boolean {
        try {
            const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

            const childProcess = spawn(shell, [], {
                cwd: options?.cwd ?? process.env.HOME,
                env: process.env,
                shell: true,
            });

            childProcess.stdout.on('data', (data: Buffer) => {
                this.addTerminalMessage(id, data.toString());
            });

            childProcess.stderr.on('data', (data: Buffer) => {
                this.addTerminalMessage(id, data.toString());
            });

            this.processes.set(id, childProcess);
            return true;
        } catch (error) {
            console.error('Failed to create terminal.', error);
            return false;
        }
    }

    addTerminalMessage(id: string, data: string) {
        const currentHistory = this.getHistory(id) || '';
        this.outputHistory.set(id, currentHistory + data);
        this.emitMessage(id, data);
    }

    emitMessage(id: string, data: string) {
        mainWindow?.webContents.send(MainChannels.TERMINAL_ON_DATA, {
            id,
            data,
        });
    }

    write(id: string, data: string): boolean {
        try {
            this.processes.get(id)?.stdin?.write(data);
            return true;
        } catch (error) {
            console.error('Failed to write to terminal.', error);
            return false;
        }
    }

    kill(id: string): boolean {
        try {
            const process = this.processes.get(id);
            if (process) {
                if (os.platform() === 'win32') {
                    spawn('taskkill', ['/F', '/T', '/PID', process.pid!.toString()]);
                } else {
                    process.kill('SIGTERM');
                }
                this.processes.delete(id);
                this.outputHistory.delete(id);
            }
            return true;
        } catch (error) {
            console.error('Failed to kill terminal.', error);
            return false;
        }
    }

    killAll(): boolean {
        this.processes.forEach((process) => process.kill());
        this.processes.clear();
        return true;
    }

    executeCommand(id: string, command: string): boolean {
        try {
            const newline = os.platform() === 'win32' ? '\r\n' : '\n';
            return this.write(id, command + newline);
        } catch (error) {
            console.error('Failed to execute command.', error);
            return false;
        }
    }

    getHistory(id: string): string | undefined {
        return this.outputHistory.get(id);
    }
}

export default TerminalManager.getInstance();
