import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ipcMain } from 'electron';
import Chat from '../chat';
import { MainChannels } from '/common/constants';

export function listenForChatMessages() {
    ipcMain.handle(MainChannels.SEND_CHAT_MESSAGES, (e: Electron.IpcMainInvokeEvent, args) => {
        const messages = args as MessageParam[];
        return Chat.send(messages);
    });

    ipcMain.handle(
        MainChannels.SEND_CHAT_MESSAGES_STREAM,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { messages, requestId } = args as { messages: MessageParam[]; requestId: string };
            return Chat.stream(messages, requestId);
        },
    );
}
