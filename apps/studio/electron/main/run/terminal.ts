import { MainChannels } from '@onlook/models/constants';
import * as pty from 'node-pty';
import os from 'os';
import { mainWindow } from '..';
import { getBunCommand } from '../bun';

class TerminalManager {
    private static instance: TerminalManager;
    private processes: Map<string, pty.IPty>;
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
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                cwd: options?.cwd ?? process.env.HOME,
                env: process.env,
            });

            ptyProcess.onData((data: string) => {
                this.addTerminalMessage(id, data);
            });

            this.processes.set(id, ptyProcess);
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
            this.processes.get(id)?.write(data);
            return true;
        } catch (error) {
            console.error('Failed to write to terminal.', error);
            return false;
        }
    }

    resize(id: string, cols: number, rows: number): boolean {
        try {
            this.processes.get(id)?.resize(cols, rows);
            return true;
        } catch (error) {
            console.error('Failed to resize terminal.', error);
            return false;
        }
    }

    kill(id: string): boolean {
        try {
            const process = this.processes.get(id);
            if (process) {
                process.kill();
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
            let commandToExecute = command;

            const isMacIntel = process.platform === 'darwin' && process.arch === 'x64';
            if (!isMacIntel) {
                commandToExecute = getBunCommand(command);
            }
            const newline = os.platform() === 'win32' ? '\r\n' : '\n';
            return this.write(id, commandToExecute + newline);
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
