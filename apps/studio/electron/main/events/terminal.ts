import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import terminal from '../terminal';

export function listenForTerminalMessages() {
    ipcMain.handle(MainChannels.TERMINAL_CREATE, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id, options } = args as { id: string; options: { cwd?: string } };
        return terminal.createTerminal(id, options);
    });

    ipcMain.handle(MainChannels.TERMINAL_INPUT, (_, args) => {
        const { id, data } = args as { id: string; data: string };
        return terminal.write(id, data);
    });

    ipcMain.handle(MainChannels.TERMINAL_EXECUTE_COMMAND, (_, args) => {
        const { id, command } = args as { id: string; command: string };
        return terminal.executeCommand(id, command);
    });

    ipcMain.handle(MainChannels.TERMINAL_RESIZE, (_, args) => {
        const { id, cols, rows } = args as { id: string; cols: number; rows: number };
        return terminal.resize(id, cols, rows);
    });

    ipcMain.handle(MainChannels.TERMINAL_KILL, (_, args) => {
        const { id } = args as { id: string };
        return terminal.kill(id);
    });
}
