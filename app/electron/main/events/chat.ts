import { MessageParam } from '@anthropic-ai/sdk/resources';
import { ipcMain } from 'electron';
import Chat from '../chat';
import { MainChannels } from '/common/constants';

export function listenForChatMessages() {
    ipcMain.handle(MainChannels.SEND_CHAT_MESSAGES, (e: Electron.IpcMainInvokeEvent, args) => {
        const messages = args as MessageParam[];
        return Chat.send(messages);
    });
}
