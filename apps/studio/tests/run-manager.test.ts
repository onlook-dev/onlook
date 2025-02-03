import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import RunManager from '../electron/main/run';
import { IGNORED_DIRECTORIES } from '../electron/main/run/helpers';

const mockWatch = mock(() => ({
    on: mock(() => mockWatch()),
    close: mock(() => {})
}));

mock.module('chokidar', () => ({
    watch: mockWatch
}));

describe('RunManager', () => {
    const testDir = join(process.cwd(), 'test-project');
    let runManager: ReturnType<typeof RunManager.getInstance>;

    beforeEach(() => {
        if (!existsSync(testDir)) {
            mkdirSync(testDir);
        }
        runManager = RunManager.getInstance();
        mock.restore();
    });

    afterEach(async () => {
        await runManager.stopAll();
        if (existsSync(testDir)) {
            rmdirSync(testDir, { recursive: true });
        }
        mock.restore();
    });

    test('watches project directory for new files', async () => {
        const filePaths = [join(testDir, 'test.tsx')];
        writeFileSync(filePaths[0], 'export default () => <div>Test</div>');

        await runManager.listen(filePaths, testDir);

        expect(mockWatch).toHaveBeenCalledWith(
            testDir,
            expect.objectContaining({
                persistent: true,
                ignored: [
                    /(^|[.])\../,
                    ...IGNORED_DIRECTORIES.map(dir => `**/${dir}/**`),
                    expect.any(Function)
                ]
            })
        );
    });

    test('processes new files when created', async () => {
        const filePaths = [join(testDir, 'test.tsx')];
        writeFileSync(filePaths[0], 'export default () => <div>Test</div>');

        const mockWatcher = {
            on: mock(() => mockWatcher),
            close: mock(() => {})
        };
        mockWatch.mockImplementation(() => mockWatcher);

        await runManager.listen(filePaths, testDir);

        const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
        expect(addHandler).toBeDefined();

        const newFile = join(testDir, 'new.tsx');
        writeFileSync(newFile, 'export default () => <div>New</div>');
        await addHandler?.(newFile);

        expect(runManager.getTemplateNode('new')).toBeDefined();
    });

    test('ignores files in excluded directories', async () => {
        const filePaths = [join(testDir, 'test.tsx')];
        writeFileSync(filePaths[0], 'export default () => <div>Test</div>');

        const mockWatcher = {
            on: mock(() => mockWatcher),
            close: mock(() => {})
        };
        mockWatch.mockImplementation(() => mockWatcher);

        await runManager.listen(filePaths, testDir);

        const ignoredDir = join(testDir, 'node_modules');
        mkdirSync(ignoredDir);
        const ignoredFile = join(ignoredDir, 'ignored.tsx');
        writeFileSync(ignoredFile, 'export default () => <div>Ignored</div>');

        const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
        await addHandler?.(ignoredFile);

        expect(runManager.getTemplateNode('ignored')).toBeUndefined();
    });

    test('only watches files with allowed extensions', async () => {
        const filePaths = [join(testDir, 'test.tsx')];
        writeFileSync(filePaths[0], 'export default () => <div>Test</div>');

        const mockWatcher = {
            on: mock(() => mockWatcher),
            close: mock(() => {})
        };
        mockWatch.mockImplementation(() => mockWatcher);

        await runManager.listen(filePaths, testDir);

        const addHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'add')?.[1];
        expect(addHandler).toBeDefined();

        const jsFile = join(testDir, 'test.js');
        writeFileSync(jsFile, 'console.log("test")');
        await addHandler?.(jsFile);

        const tsxFile = join(testDir, 'test.tsx');
        writeFileSync(tsxFile, 'export default () => <div>Test</div>');
        await addHandler?.(tsxFile);

        expect(runManager.getTemplateNode('js-component')).toBeUndefined();
        expect(runManager.getTemplateNode('tsx-component')).toBeDefined();
    });
});
