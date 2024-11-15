import { describe, test } from 'bun:test';
import runManager from '../electron/main/run';

describe('preRun', () => {
    test('should find jsx and tsx files but ignore node_modules', async () => {
        const dirPath = '/Users/kietho/workplace/onlook/test/test';
        await runManager.setup(dirPath);
    });
});

describe('postRun', () => {
    test('should find jsx and tsx files but ignore node_modules', async () => {});
});
