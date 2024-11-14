import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import terminal from '../terminal';

export function listenForTerminalMessages() {
    ipcMain.handle(MainChannels.TERMINAL_CREATE, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id, options } = args as { id: string; options: { cwd?: string } };
        terminal.createTerminal(id, options);
    });

    ipcMain.handle(MainChannels.TERMINAL_INPUT, (_, args) => {
        const { id, data } = args;
        terminal.write(id, data);
    });

    ipcMain.handle(MainChannels.TERMINAL_RESIZE, (_, args) => {
        const { id, cols, rows } = args;
        terminal.resize(id, cols, rows);
    });

    ipcMain.handle(MainChannels.TERMINAL_KILL, (_, args) => {
        const { id } = args;
        terminal.kill(id);
    });
}
