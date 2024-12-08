import { MainChannels } from '@onlook/models/constants';
import { type ChildProcess, spawn } from 'child_process';
import os from 'os';
import treeKill from 'tree-kill';
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
            const shellArgs =
                os.platform() === 'win32' ? ['-NoLogo', '-ExecutionPolicy', 'Bypass'] : [];

            const childProcess = spawn(shell, shellArgs, {
                cwd: options?.cwd ?? process.env.HOME,
                env: process.env,
                shell: true,
                detached: false,
            });

            childProcess.stdout?.on('data', (data: Buffer) => {
                this.addTerminalMessage(id, data, false);
            });

            childProcess.stderr?.on('data', (data: Buffer) => {
                this.addTerminalMessage(id, data, true);
            });

            this.processes.set(id, childProcess);
            return true;
        } catch (error) {
            console.error('Failed to create terminal.', error);
            return false;
        }
    }

    addTerminalMessage(id: string, data: Buffer, isError: boolean) {
        const currentHistory = this.getHistory(id) || '';
        const dataString = data.toString();
        this.outputHistory.set(id, currentHistory + dataString);
        this.emitMessage(id, dataString, isError);
    }

    emitMessage(id: string, data: string, isError: boolean) {
        mainWindow?.webContents.send(MainChannels.TERMINAL_ON_DATA, {
            id,
            data,
            isError,
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

    resize(id: string, cols: number, rows: number): boolean {
        try {
            // this.processes.get(id)?.stdin?.setWindowSize(cols, rows);
            return true;
        } catch (error) {
            console.error('Failed to resize terminal.', error);
            return false;
        }
    }

    kill(id: string): boolean {
        try {
            const childProcess = this.processes.get(id);
            if (childProcess) {
                treeKill(childProcess.pid!);
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
        this.processes.forEach((childProcess) => {
            if (childProcess.pid) {
                treeKill(childProcess.pid);
            }
        });
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
