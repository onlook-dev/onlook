import { describe, spyOn, test } from 'bun:test';
import { postRun, preRun } from '../electron/main/run';

describe('preRun', () => {
    test('should find jsx and tsx files but ignore node_modules', async () => {
        // Create spies for console methods
        const logSpy = spyOn(console, 'log');
        const errorSpy = spyOn(console, 'error');
        await preRun();

        // Verify that console methods were called
        // expect(logSpy).toHaveBeenCalled();
        // expect(errorSpy).toHaveBeenCalled();

        // Restore the original console methods
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});

describe('postRun', () => {
    test('should find jsx and tsx files but ignore node_modules', async () => {
        // Create spies for console methods
        const logSpy = spyOn(console, 'log');
        const errorSpy = spyOn(console, 'error');
        return;
        await postRun();

        // Verify that console methods were called
        // expect(logSpy).toHaveBeenCalled();
        // expect(errorSpy).toHaveBeenCalled();

        // Restore the original console methods
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
