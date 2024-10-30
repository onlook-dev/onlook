import { CoreMessage } from 'ai';
import { ipcMain } from 'electron';
import Chat from '../chat';
import { MainChannels } from '/common/constants';

export function listenForChatMessages() {
    ipcMain.handle(
        MainChannels.SEND_CHAT_MESSAGES_STREAM,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { messages, requestId } = args as { messages: CoreMessage[]; requestId: string };
            return Chat.stream(messages);
        },
    );
}
