import { MessageContextType } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import path from 'path';
import { FileContext, HighlightContext } from '../../src/contexts/classes';
import {
    type HydrateMessageOptions,
    getCreatePageSystemPrompt,
    getHydratedUserMessage,
    getSummaryPrompt,
    getSystemPrompt,
} from '../../src/prompt/provider';

const __dirname = import.meta.dir;

describe('Prompt', () => {
    // Set to true to update the data files
    const SHOULD_UPDATE_DATA = true;

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
        const options: HydrateMessageOptions = {
            totalMessages: 1,
            currentMessageIndex: 0,
            lastUserMessageIndex: 0,
            lastAssistantMessageIndex: 0,
        };

        const message = getHydratedUserMessage(
            'test',
            [{ type: 'text', text: 'test' }],
            [
                {
                    path: 'test.txt',
                    content: 'test',
                    type: MessageContextType.FILE,
                    displayName: 'test.txt',
                    branchId: 'test',
                },

                {
                    path: 'test.txt',
                    start: 1,
                    end: 2,
                    content: 'test',
                    type: MessageContextType.HIGHLIGHT,
                    displayName: 'test.txt',
                    branchId: 'test',
                },

                {
                    content: 'test',
                    type: MessageContextType.ERROR,
                    displayName: 'test',
                    branchId: 'test',
                },
                {
                    path: 'test-rule.md',
                    type: MessageContextType.AGENT_RULE,
                    displayName: 'test',
                    content: '',
                },
            ],
            options,
        );

        const prompt = message.parts[0]?.type === 'text' ? message.parts[0].text : '';

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('User empty message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user-empty.txt');

        const options: HydrateMessageOptions = {
            totalMessages: 1,
            currentMessageIndex: 0,
            lastUserMessageIndex: 0,
            lastAssistantMessageIndex: 0,
        };

        const message = getHydratedUserMessage('test', [], [], options);
        const prompt = message.parts[0]?.type === 'text' ? message.parts[0].text : '';

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('File content should be the same', async () => {
        const fileContentPath = path.resolve(__dirname, './data/file.txt');

        const prompt = FileContext.getFilesContent(
            [
                {
                    path: 'test.txt',
                    content: 'test',
                    type: MessageContextType.FILE,
                    displayName: 'test.txt',
                    branchId: 'test',
                },
                {
                    path: 'test2.txt',
                    content: 'test2',
                    type: MessageContextType.FILE,
                    displayName: 'test2.txt',
                    branchId: 'test',
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
                    branchId: 'test',
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

        const prompt = HighlightContext.getHighlightsContent('test.txt', [
            {
                path: 'test.txt',
                start: 1,
                end: 2,
                content: 'test',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
                branchId: 'test',
            },
            {
                path: 'test.txt',
                start: 3,
                end: 4,
                content: 'test2',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
                branchId: 'test',
            },
        ], 'test');
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
