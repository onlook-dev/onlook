import type { ChatConversation, ProjectSuggestions } from '@onlook/models/chat';
import { StreamRequestType } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { SampleFeedbackType } from '@trainloop/sdk';
import type { CoreMessage, Message } from 'ai';
import { ipcMain } from 'electron';
import Chat from '../chat';
import trainloop from '../chat/trainloop';
import { PersistentStorage } from '../storage';

export function listenForChatMessages() {
    ipcMain.handle(
        MainChannels.SEND_CHAT_MESSAGES_STREAM,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { messages, requestType } = args as {
                messages: CoreMessage[];
                requestType: StreamRequestType;
            };
            return Chat.stream(messages, requestType);
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

    ipcMain.handle(MainChannels.GENERATE_SUGGESTIONS, (e: Electron.IpcMainInvokeEvent, args) => {
        const { messages } = args as {
            messages: CoreMessage[];
        };
        return Chat.generateSuggestions(messages);
    });

    ipcMain.handle(
        MainChannels.GET_SUGGESTIONS_BY_PROJECT,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { projectId } = args as { projectId: string };
            const suggestions = PersistentStorage.SUGGESTIONS.getCollection(
                projectId,
            ) as ProjectSuggestions[];
            return suggestions.flatMap((suggestion) => suggestion.suggestions);
        },
    );

    ipcMain.handle(MainChannels.SAVE_SUGGESTIONS, (e: Electron.IpcMainInvokeEvent, args) => {
        const { suggestions } = args as { suggestions: ProjectSuggestions };
        return PersistentStorage.SUGGESTIONS.writeItem(suggestions);
    });

    ipcMain.handle(MainChannels.GENERATE_CHAT_SUMMARY, async (e, args) => {
        const { messages } = args as { messages: CoreMessage[] };
        return Chat.generateChatSummary(messages);
    });

    ipcMain.handle(MainChannels.SAVE_APPLY_RESULT, (e, args) => {
        const { type, messages } = args as { type: SampleFeedbackType; messages: Message[] };
        return trainloop.saveApplyResult(messages, type);
    });
}
