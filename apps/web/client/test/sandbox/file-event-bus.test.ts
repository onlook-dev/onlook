import { beforeEach, describe, expect, mock, test } from 'bun:test';


import { FileEventBus } from "../../src/components/store/editor/sandbox/file-event-bus";
import type { FileEvent } from '../../src/components/store/editor/sandbox/file-event-bus';

describe('FileEventBus', () => {
    let bus: FileEventBus;

    beforeEach(() => {
        bus = new FileEventBus();
    });

    test('should call subscribers when publishing matching events', () => {
        const callback = mock(() => {});
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('add', callback);
        bus.publish(event);

        expect(callback).toHaveBeenCalledWith(event);
    });

    test('should not call subscribers for non-matching events', () => {
        const callback = mock(() => {});
        const event: FileEvent = {
            type: 'change',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('add', callback);
        bus.publish(event);

        expect(callback).not.toHaveBeenCalled();
    });

    test('should handle multiple subscribers for the same event type', () => {
        const callback1 = mock(() => {});
        const callback2 = mock(() => {});
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('add', callback1);
        bus.subscribe('add', callback2);
        bus.publish(event);

        expect(callback1).toHaveBeenCalledWith(event);
        expect(callback2).toHaveBeenCalledWith(event);
    });

    test('should handle wildcard (*) subscription', () => {
        const callback = mock(() => {});
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('*', callback);
        bus.publish(event);

        expect(callback).toHaveBeenCalledWith(event);
    });

    test('should remove subscriber when unsubscribing', () => {
        const callback = mock(() => {});
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        const unsubscribe = bus.subscribe('add', callback);
        unsubscribe();
        bus.publish(event);

        expect(callback).not.toHaveBeenCalled();
    });

    test('should call error handler when subscriber throws an error', () => {
        const error = new Error('Test error');
        const errorHandler = mock(() => {});
        const callback = mock(() => {
            throw error;
        });
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.setErrorHandler(errorHandler);
        bus.subscribe('add', callback);
        bus.publish(event);

        expect(errorHandler).toHaveBeenCalledWith(error, event);
    });

    test('should log to console when no error handler is set', () => {
        const originalConsoleError = console.error;
        console.error = mock(() => {});
        const error = new Error('Test error');
        const callback = mock(() => {
            throw error;
        });
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('add', callback);
        bus.publish(event);

        expect(console.error).toHaveBeenCalledWith('Error in file event subscriber:', error);
        console.error = originalConsoleError;
    });

    test('should clear all subscribers for a specific event type', () => {
        const callback1 = mock(() => {});
        const callback2 = mock(() => {});
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('add', callback1);
        bus.subscribe('change', callback2);
        bus.clearSubscribers('add');
        bus.publish(event);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
    });

    test('should clear all subscribers when no event type is specified', () => {
        const callback1 = mock(() => {});
        const callback2 = mock(() => {});
        const event: FileEvent = {
            type: 'add',
            paths: ['test.txt'],
            timestamp: Date.now()
        };

        bus.subscribe('add', callback1);
        bus.subscribe('change', callback2);
        bus.clearSubscribers();
        bus.publish(event);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
    });
});