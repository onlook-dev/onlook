import { type ChatType } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export interface QueuedMessage {
    content: string;
    type: ChatType;
    id: string;
    timestamp: number;
}

export class MessageQueue {
    private _queue: QueuedMessage[] = [];
    private _isProcessing = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get queue(): QueuedMessage[] {
        return this._queue;
    }

    get length(): number {
        return this._queue.length;
    }

    get isProcessing(): boolean {
        return this._isProcessing;
    }

    get isEmpty(): boolean {
        return this._queue.length === 0;
    }

    enqueue(content: string, type: ChatType): QueuedMessage {
        const message: QueuedMessage = {
            content: content.trim(),
            type,
            id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };
        
        this._queue.push(message);
        return message;
    }

    dequeue(): QueuedMessage | null {
        return this._queue.shift() || null;
    }

    removeMessage(id: string): boolean {
        const index = this._queue.findIndex(msg => msg.id === id);
        if (index !== -1) {
            this._queue.splice(index, 1);
            return true;
        }
        return false;
    }

    clear(): void {
        this._queue = [];
        this._isProcessing = false;
    }

    async processNext(): Promise<void> {
        if (this._isProcessing || this.isEmpty || this.editorEngine.chat.isStreaming) {
            return;
        }

        const nextMessage = this.dequeue();
        if (!nextMessage) {
            return;
        }

        this._isProcessing = true;
        
        try {
            await this.editorEngine.chat.sendMessage(nextMessage.content, nextMessage.type);
        } catch (error) {
            console.error('Error processing queued message:', error);
        } finally {
            this._isProcessing = false;
        }
    }

    async processAll(): Promise<void> {
        while (!this.isEmpty && !this.editorEngine.chat.isStreaming) {
            await this.processNext();
        }
    }
}