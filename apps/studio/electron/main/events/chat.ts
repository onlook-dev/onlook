import type { ChatConversation, ProjectSuggestions } from '@onlook/models/chat';
import { StreamRequestType } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { ipcMain, MessageChannelMain } from 'electron';
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
            
            // Create a message channel for duplex communication
            const { port1, port2 } = new MessageChannelMain();
            
            // Transfer port2 to the renderer process
            e.sender.postMessage(MainChannels.CHAT_STREAM_CHANNEL, null, [port2]);
            
            // Start the port to begin receiving messages
            port1.start();
            
            // Handle abort messages from renderer
            port1.on('message', (event) => {
                const { type } = event.data;
                if (type === 'abort') {
                    Chat.abortStream(port1);
                }
            });
            
            // Handle port closure
            port1.on('close', () => {
                // Clean up resources if needed
            });
            
            // Start streaming
            Chat.stream(messages, requestType, port1);
            
            // Return a placeholder response
            // The actual responses will be sent through the MessagePort
            return { status: 'streaming', content: '' };
        },
    );

    // This handler is kept for backward compatibility
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
}
