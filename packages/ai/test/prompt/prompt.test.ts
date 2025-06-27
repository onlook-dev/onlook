import { MessageContextType } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import path from 'path';
import {
    getCreatePageSystemPrompt,
    getFilesContent,
    getHighlightsContent,
    getHydratedUserMessage,
    getSummaryPrompt,
    getSystemPrompt,
} from '../../src/prompt/provider';

const __dirname = import.meta.dir;

describe('Prompt', () => {
    // Set to true to update the data files
    const SHOULD_UPDATE_DATA = false;

    const SHOULD_WRITE_SYSTEM = SHOULD_UPDATE_DATA;
    const SHOULD_WRITE_USER_MESSAGE = SHOULD_UPDATE_DATA;
    const SHOULD_WRITE_FILE_CONTENT = SHOULD_UPDATE_DATA;
    const SHOULD_WRITE_HIGHLIGHTS = SHOULD_UPDATE_DATA;
    const SHOULD_WRITE_SUMMARY = SHOULD_UPDATE_DATA;
    const SHOULD_WRITE_CREATE_PAGE_SYSTEM = SHOULD_UPDATE_DATA;

    test('System prompt should be the same', async () => {
        const systemPath = path.resolve(__dirname, './data/system.txt');

        const prompt = getSystemPrompt();
        if (SHOULD_WRITE_SYSTEM) {
            await Bun.write(systemPath, prompt);
        }

        const existing = await Bun.file(systemPath).text();
        expect(prompt).toEqual(existing);
    });

    test('User message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user.txt');

        const message = getHydratedUserMessage('test', 'test', [
            {
                path: 'test.txt',
                content: 'test',
                type: MessageContextType.FILE,
                displayName: 'test.txt',
            },

            {
                path: 'test.txt',
                start: 1,
                end: 2,
                content: 'test',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
            },

            {
                content: 'test',
                type: MessageContextType.ERROR,
                displayName: 'test',
            },
            {
                path: 'test',
                type: MessageContextType.PROJECT,
                displayName: 'test',
                content: '',
            },
        ]);

        const prompt = message.content;

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('User empty message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user-empty.txt');

        const message = getHydratedUserMessage('test', '', []);
        const prompt = message.content;

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('File content should be the same', async () => {
        const fileContentPath = path.resolve(__dirname, './data/file.txt');

        const prompt = getFilesContent(
            [
                {
                    path: 'test.txt',
                    content: 'test',
                    type: MessageContextType.FILE,
                    displayName: 'test.txt',
                },
                {
                    path: 'test2.txt',
                    content: 'test2',
                    type: MessageContextType.FILE,
                    displayName: 'test2.txt',
                },
            ],
            [
                {
                    path: 'test.txt',
                    start: 1,
                    end: 2,
                    content: 'test',
                    type: MessageContextType.HIGHLIGHT,
                    displayName: 'test.txt',
                },
            ],
        );

        if (SHOULD_WRITE_FILE_CONTENT) {
            await Bun.write(fileContentPath, prompt);
        }

        const existing = await Bun.file(fileContentPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Highlights should be the same', async () => {
        const highlightsPath = path.resolve(__dirname, './data/highlights.txt');

        const prompt = getHighlightsContent('test.txt', [
            {
                path: 'test.txt',
                start: 1,
                end: 2,
                content: 'test',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
            },
            {
                path: 'test.txt',
                start: 3,
                end: 4,
                content: 'test2',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
            },
        ]);
        if (SHOULD_WRITE_HIGHLIGHTS) {
            await Bun.write(highlightsPath, prompt);
        }

        const existing = await Bun.file(highlightsPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Summary prompt should be the same', async () => {
        const summaryPath = path.resolve(__dirname, './data/summary.txt');

        const prompt = getSummaryPrompt();
        if (SHOULD_WRITE_SUMMARY) {
            await Bun.write(summaryPath, prompt);
        }

        const existing = await Bun.file(summaryPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Create page system prompt should be the same', async () => {
        const createPageSystemPath = path.resolve(__dirname, './data/create-page-system.txt');

        const prompt = getCreatePageSystemPrompt();
        if (SHOULD_WRITE_CREATE_PAGE_SYSTEM) {
            await Bun.write(createPageSystemPath, prompt);
        }

        const existing = await Bun.file(createPageSystemPath).text();
        expect(prompt).toEqual(existing);
    });
});
