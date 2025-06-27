export type FileEventType = 'add' | 'change' | 'remove' | 'rename' | '*';

export interface FileEvent {
    type: FileEventType;
    paths: string[];
    timestamp: number;
}

export class FileEventBus {
    private subscribers: Map<string, Set<(event: FileEvent) => void>> = new Map();
    private errorHandler: ((error: Error, event: FileEvent) => void) | null = null;

    constructor() {}

    /**
     * Subscribe to file events
     * @param eventType The type of event to subscribe to. Use '*' to subscribe to all events
     * @param callback The callback function to be called when the event occurs
     * @returns A function to unsubscribe from the event
     */
    subscribe(eventType: FileEventType, callback: (event: FileEvent) => void) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType)!.add(callback);
        return () => this.unsubscribe(eventType, callback);
    }

    /**
     * Unsubscribe from file events
     * @param eventType The type of event to unsubscribe from
     * @param callback The callback function to remove
     */
    unsubscribe(eventType: FileEventType, callback: (event: FileEvent) => void) {
        this.subscribers.get(eventType)?.delete(callback);
    }

    /**
     * Set a global error handler for all subscribers
     * @param handler The error handler function
     */
    setErrorHandler(handler: (error: Error, event: FileEvent) => void) {
        this.errorHandler = handler;
    }

    /**
     * Publish a file event to all subscribers
     * @param event The event to publish
     */
    publish(event: FileEvent) {
        // Notify specific subscribers
        this.subscribers.get(event.type)?.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                this.handleError(error as Error, event);
            }
        });

        // Notify wildcard subscribers
        this.subscribers.get('*')?.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                this.handleError(error as Error, event);
            }
        });
    }

    private handleError(error: Error, event: FileEvent) {
        if (this.errorHandler) {
            this.errorHandler(error, event);
        } else {
            console.error('Error in file event subscriber:', error);
        }
    }

    /**
     * Clear all subscribers for a specific event type
     * @param eventType The type of event to clear subscribers for
     */
    clearSubscribers(eventType?: FileEventType) {
        if (eventType) {
            this.subscribers.delete(eventType);
        } else {
            this.subscribers.clear();
        }
    }
} 