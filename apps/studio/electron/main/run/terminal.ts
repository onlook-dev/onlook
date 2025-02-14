import { MainChannels } from '@onlook/models/constants';
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import { mainWindow } from '..';
import { getBunCommand } from '../bun';

class TerminalManager {
    private static instance: TerminalManager;
    private ptyProcess: ChildProcess | null = null;
    private outputHistory: Map<string, string>;

    private constructor() {
        this.outputHistory = new Map();
        this.initPtyProcess();
    }

    static getInstance(): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }

    private initPtyProcess() {
        const ptyScriptPath = path.join(__dirname, '../run/pty-process/index.js');
        this.ptyProcess = fork(ptyScriptPath, [], {
            env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        });

        this.ptyProcess.on('message', (message: any) => {
            const { type, payload } = message;
            if (type === 'DATA') {
                this.addTerminalMessage(payload.id, payload.data);
            }
        });
    }

    create(id: string, options?: { cwd?: string }): boolean {
        try {
            this.ptyProcess?.send({
                type: 'CREATE',
                payload: { id, cwd: options?.cwd },
            });
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
            this.ptyProcess?.send({
                type: 'WRITE',
                payload: { id, data },
            });
            return true;
        } catch (error) {
            console.error('Failed to write to terminal.', error);
            return false;
        }
    }

    resize(id: string, cols: number, rows: number): boolean {
        try {
            this.ptyProcess?.send({
                type: 'RESIZE',
                payload: { id, cols, rows },
            });
            return true;
        } catch (error) {
            console.error('Failed to resize terminal.', error);
            return false;
        }
    }

    kill(id: string): boolean {
        try {
            this.ptyProcess?.send({
                type: 'KILL',
                payload: { id },
            });
            this.outputHistory.delete(id);
            return true;
        } catch (error) {
            console.error('Failed to kill terminal.', error);
            return false;
        }
    }

    killAll(): boolean {
        try {
            this.ptyProcess?.send({
                type: 'KILL_ALL',
                payload: {},
            });
            return true;
        } catch (error) {
            console.error('Failed to kill all terminals.', error);
            return false;
        }
    }

    executeCommand(id: string, command: string): boolean {
        try {
            const commandToExecute = getBunCommand(command);
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
