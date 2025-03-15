import type { ChatConversation, ProjectSuggestions, StreamResponse } from '@onlook/models/chat';
import { StreamRequestType } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { ipcMain } from 'electron';
import { nanoid } from 'nanoid';
import Chat from '../chat';
import { PersistentStorage } from '../storage';

export function listenForChatMessages() {
    ipcMain.handle(
        MainChannels.SEND_CHAT_MESSAGES_STREAM,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { messages, requestType } = args as {
                messages: CoreMessage[];
                requestType: StreamRequestType;
            };
            
            // Generate a unique ID for this stream
            const streamId = nanoid();
            
            // Start streaming in the background
            Chat.stream(messages, requestType, undefined, {
                abortController: new AbortController(),
                streamId,
                onPartial: (content: string) => {
                    // Send partial updates through IPC
                    e.sender.send(MainChannels.CHAT_STREAM_CHANNEL, {
                        status: 'partial',
                        content,
                        streamId,
                    } as StreamResponse);
                },
                onComplete: (response: StreamResponse) => {
                    // Send complete response through IPC
                    e.sender.send(MainChannels.CHAT_STREAM_CHANNEL, {
                        ...response,
                        streamId: undefined,
                    });
                },
                onError: (error: string) => {
                    // Send error through IPC
                    e.sender.send(MainChannels.CHAT_STREAM_CHANNEL, {
                        status: 'error',
                        content: error,
                        streamId: undefined,
                    });
                }
            });
            
            // Return the stream ID to the renderer
            return { status: 'streaming', content: '', streamId };
        },
    );

    // This handler is kept for backward compatibility and updated to use streamId
    ipcMain.handle(
        MainChannels.SEND_STOP_STREAM_REQUEST,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { streamId } = args as { streamId?: string };
            return Chat.abortStream(undefined, streamId);
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
}
