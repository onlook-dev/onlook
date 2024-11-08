import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { ipcMain } from 'electron';
import Chat from '../chat';
import { PersistentStorage } from '../storage';

export function listenForChatMessages() {
    ipcMain.handle(
        MainChannels.SEND_CHAT_MESSAGES_STREAM,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { messages, requestId } = args as { messages: CoreMessage[]; requestId: string };
            return Chat.stream(requestId, messages);
        },
    );

    ipcMain.handle(
        MainChannels.SEND_STOP_STREAM_REQUEST,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { requestId } = args as { requestId: string };
            return Chat.abortStream(requestId);
        },
    );

    ipcMain.handle(
        MainChannels.GET_CHAT_CONVERSATIONS_BY_PROJECT,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { projectId } = args as { projectId: string };
            return PersistentStorage.CONVERSATIONS.getCollection(projectId);
        },
    );
}
