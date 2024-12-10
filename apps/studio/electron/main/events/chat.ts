import type { ChatConversation } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { ipcMain } from 'electron';
import Chat from '../chat';
import { PersistentStorage } from '../storage';

export function listenForChatMessages() {
    ipcMain.handle(
        MainChannels.SEND_CHAT_MESSAGES_STREAM,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { messages } = args as { messages: CoreMessage[] };
            return Chat.stream(messages);
        },
    );

    ipcMain.handle(
        MainChannels.SEND_STOP_STREAM_REQUEST,
        (e: Electron.IpcMainInvokeEvent, args) => {
            return Chat.abortStream();
        },
    );

    ipcMain.handle(
        MainChannels.GET_CONVERSATIONS_BY_PROJECT,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { projectId } = args as { projectId: string };
            return PersistentStorage.CONVERSATIONS.getCollection(projectId);
        },
    );

    ipcMain.handle(MainChannels.SAVE_CONVERSATION, (e: Electron.IpcMainInvokeEvent, args) => {
        const { conversation } = args as { conversation: ChatConversation };
        return PersistentStorage.CONVERSATIONS.writeItem(conversation);
    });

    ipcMain.handle(MainChannels.DELETE_CONVERSATION, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id } = args as { id: string };
        return PersistentStorage.CONVERSATIONS.deleteItem(id);
    });
}
