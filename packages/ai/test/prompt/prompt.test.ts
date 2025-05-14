import { MessageContextType } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import path from 'path';
import { SEARCH_REPLACE_EXAMPLE_CONVERSATION } from 'src/prompt/edit';
import { PromptProvider } from '../../src/prompt/provider';

const __dirname = import.meta.dir;

describe('Prompt', () => {
    const SHOULD_WRITE_SYSTEM = false;
    const SHOULD_WRITE_EXAMPLES = false;
    const SHOULD_WRITE_USER_MESSAGE = false;
    const SHOULD_WRITE_FILE_CONTENT = false;
    const SHOULD_WRITE_HIGHLIGHTS = false;
    const SHOULD_WRITE_SUMMARY = false;
    const SHOULD_WRITE_CREATE_PAGE_SYSTEM = false;

    test('System prompt should be the same', async () => {
        const systemPath = path.resolve(__dirname, './data/system.txt');

        const prompt = new PromptProvider().getSystemPrompt('darwin');
        if (SHOULD_WRITE_SYSTEM) {
            await Bun.write(systemPath, prompt);
        }

        const existing = await Bun.file(systemPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Examples should be the same', async () => {
        const examplesPath = path.resolve(__dirname, './data/examples.txt');

        const prompt = new PromptProvider().getExampleConversation(
            SEARCH_REPLACE_EXAMPLE_CONVERSATION,
        );
        if (SHOULD_WRITE_EXAMPLES) {
            await Bun.write(examplesPath, prompt);
        }

        const existing = await Bun.file(examplesPath).text();
        expect(prompt).toEqual(existing);
    });

    test('User message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user.txt');

        const message = new PromptProvider().getHydratedUserMessage('test', [
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

        const prompt =
            typeof message.content === 'string'
                ? message.content
                : message.content.map((c) => (c.type === 'text' ? c.text : '')).join('');

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('User empty message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user-empty.txt');

        const message = new PromptProvider().getHydratedUserMessage('test', []);
        const prompt =
            typeof message.content === 'string'
                ? message.content
                : message.content.map((c) => (c.type === 'text' ? c.text : '')).join('');

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('File content should be the same', async () => {
        const fileContentPath = path.resolve(__dirname, './data/file.txt');

        const prompt = new PromptProvider().getFilesContent(
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

        const prompt = new PromptProvider().getHighlightsContent('test.txt', [
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

        const prompt = new PromptProvider().getSummaryPrompt();
        if (SHOULD_WRITE_SUMMARY) {
            await Bun.write(summaryPath, prompt);
        }

        const existing = await Bun.file(summaryPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Create page system prompt should be the same', async () => {
        const createPageSystemPath = path.resolve(__dirname, './data/create-page-system.txt');

        const prompt = new PromptProvider().getCreatePageSystemPrompt();
        if (SHOULD_WRITE_CREATE_PAGE_SYSTEM) {
            await Bun.write(createPageSystemPath, prompt);
        }

        const existing = await Bun.file(createPageSystemPath).text();
        expect(prompt).toEqual(existing);
    });
});
