import { ipcMain } from 'electron';
import { TunnelService } from '../tunnel';
import { MainChannels } from '/common/constants';

export function listenForTunnelMessages() {
    const tunnelService = new TunnelService();

    ipcMain.handle(MainChannels.OPEN_TUNNEL, (e: Electron.IpcMainInvokeEvent, args) => {
        const port = args as number;
        return tunnelService.open(port);
    });

    ipcMain.handle(MainChannels.CLOSE_TUNNEL, (e: Electron.IpcMainInvokeEvent) => {
        return tunnelService.close();
    });
}
