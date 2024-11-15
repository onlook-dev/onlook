import { describe, test } from 'bun:test';
import runManager from '../electron/main/run';
const dirPath = '/Users/kietho/workplace/onlook/test/starter';

describe('preRun', () => {
    test('should find jsx and tsx files but ignore node_modules', async () => {
        await runManager.setup(dirPath);
    });
});

// describe('postRun', () => {
//     test('should find jsx and tsx files but ignore node_modules', async () => {
//         await runManager.cleanup(dirPath);
//     });
// });
