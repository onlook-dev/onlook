import type { BrowserWindow } from 'electron';
import IPCStream from 'electron-ipc-stream';
import { mainWindow } from '../..';
import { MainChannels } from '@onlook/models/constants';

export class ChatStreamManager {
  private static instance: ChatStreamManager;
  private streams: Map<string, IPCStream> = new Map();

  private constructor() {}

  public static getInstance(): ChatStreamManager {
    if (!ChatStreamManager.instance) {
      ChatStreamManager.instance = new ChatStreamManager();
    }
    return ChatStreamManager.instance;
  }

  public createStream(requestId: string): IPCStream {
    if (this.streams.has(requestId)) {
      return this.streams.get(requestId)!;
    }

    const stream = new IPCStream(`${MainChannels.CHAT_STREAM_PARTIAL}-${requestId}`, mainWindow as BrowserWindow);
    this.streams.set(requestId, stream);
    return stream;
  }

  public getStream(requestId: string): IPCStream | undefined {
    return this.streams.get(requestId);
  }

  public closeStream(requestId: string): boolean {
    const stream = this.streams.get(requestId);
    if (stream) {
      stream.end();
      this.streams.delete(requestId);
      return true;
    }
    return false;
  }

  public closeAllStreams(): void {
    for (const [requestId, stream] of this.streams.entries()) {
      stream.end();
      this.streams.delete(requestId);
    }
  }
}

export default ChatStreamManager.getInstance();
