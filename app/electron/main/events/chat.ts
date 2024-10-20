import { ipcMain } from 'electron';
import { MainChannels } from '/common/constants';

export function listenForChatMessages() {
    ipcMain.handle(MainChannels.SEND_CHAT_MESSAGE, (e: Electron.IpcMainInvokeEvent, args) => {
        const message = args as string;
        console.log('Chat message received:', message);
        return 'Message received';
    });
}
