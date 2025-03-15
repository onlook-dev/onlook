import type { StreamResponse } from '@onlook/models/chat';
import type { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';

/**
 * Helper function to handle stream-based IPC communication on the main process side.
 * This simplifies setting up stream handlers by providing a consistent pattern.
 * 
 * @template T - The type of the request arguments
 * @template R - The type of the response data
 * @param channel - The main channel to handle
 * @param handler - The function that processes the request and returns a stream
 * @param abortHandler - Optional function to handle stream abortion
 * @returns void - The function registers IPC handlers but doesn't return anything
 * 
 * @example
 * // Example usage with Chat stream
 * handleStream<
 *   { messages: CoreMessage[]; requestType: StreamRequestType },
 *   StreamResponse
 * >(
 *   MainChannels.SEND_CHAT_MESSAGES_STREAM,
 *   async (event, args, callbacks) => {
 *     // Stream handling logic
 *     return { streamId: args.streamId };
 *   },
 *   async (event, streamId) => {
 *     // Abort handling logic
 *     return true;
 *   }
 * );
 */
export function handleStream<T, R>(
    channel: MainChannels,
    handler: (
        event: Electron.IpcMainInvokeEvent,
        args: T & { streamId: string },
        callbacks: {
            onPartial: (data: any) => void;
            onComplete: (data: R) => void;
            onError: (error: string) => void;
        }
    ) => Promise<{ streamId: string }>,
    abortHandler?: (
        event: Electron.IpcMainInvokeEvent,
        streamId: string
    ) => Promise<boolean>
): void {
    ipcMain.handle(channel, async (event, args) => {
        const { streamId, ...rest } = args as T & { streamId: string };
        
        // Create stream-specific channel based on the streamId
        const streamChannel = `${channel}-stream-${streamId}`;
        
        // Set up callbacks that send data through the stream channel
        const callbacks = {
            onPartial: (data: any) => {
                event.sender.send(streamChannel, data, 'partial');
            },
            onComplete: (data: R) => {
                event.sender.send(streamChannel, data, 'done');
            },
            onError: (error: string) => {
                event.sender.send(streamChannel, error, 'error');
            }
        };
        
        // Call the handler with the arguments and callbacks
        return handler(event, args as T & { streamId: string }, callbacks);
    });
    
    // Automatically set up the abort handler
    ipcMain.handle(`${channel}-abort`, async (event, args) => {
        const { streamId } = args as { streamId: string };
        
        if (abortHandler) {
            // Use the provided abort handler if available
            const aborted = await abortHandler(event, streamId);
            return { aborted, streamId };
        }
        
        // Default behavior if no abort handler is provided
        return { aborted: true, streamId };
    });
}
