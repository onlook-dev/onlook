import RunManager from '../index';
import terminal from '../terminal';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('RunManager startTerminal', () => {
    let runManager: RunManager;
    const mockTerminal = {
        create: jest.fn(),
        executeCommand: jest.fn(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        runManager = RunManager.getInstance();
        // @ts-ignore
        terminal.create = mockTerminal.create;
        // @ts-ignore
        terminal.executeCommand = mockTerminal.executeCommand;
    });

    test('handles regular command without port', () => {
        runManager.startTerminal('test-id', '/test/path', 'echo "test"');

        expect(mockTerminal.create).toHaveBeenCalledWith('test-id', {
            cwd: '/test/path',
        });
        expect(mockTerminal.executeCommand).toHaveBeenCalledWith('test-id', 'echo "test"');
    });

    test('handles PORT env var format', () => {
        runManager.startTerminal('test-id', '/test/path', 'PORT=3001 npm start');

        expect(mockTerminal.create).toHaveBeenCalledWith('test-id', {
            cwd: '/test/path',
            env: { PORT: '3001' },
        });
        expect(mockTerminal.executeCommand).toHaveBeenCalledWith('test-id', 'npm start');
    });

    test('handles CLI arg format', () => {
        runManager.startTerminal('test-id', '/test/path', 'npm start -- -p 3001');

        expect(mockTerminal.create).toHaveBeenCalledWith('test-id', {
            cwd: '/test/path',
            env: { PORT: '3001' },
        });
        expect(mockTerminal.executeCommand).toHaveBeenCalledWith('test-id', 'npm start');
    });

    test('handles localhost URL in command', () => {
        runManager.startTerminal(
            'test-id',
            '/test/path',
            'wait-on http://localhost:3001 && npm start',
        );

        expect(mockTerminal.create).toHaveBeenCalledWith('test-id', {
            cwd: '/test/path',
            env: { PORT: '3001' },
        });
        expect(mockTerminal.executeCommand).toHaveBeenCalledWith(
            'test-id',
            'wait-on http://localhost:3001 && npm start',
        );
    });
});
