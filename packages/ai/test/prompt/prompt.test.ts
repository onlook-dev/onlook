import { describe, expect, test } from 'bun:test';
import path from 'path';
import { Platform } from '../../src/prompt/platform';
import { PromptProvider } from '../../src/prompt/provider';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe('Prompt', () => {
    const SHOULD_WRITE_PROMPT = false;
    const SHOULD_WRITE_EXAMPLES = false;
    const SHOULD_WRITE_USER_MESSAGE = true;
    const SHOULD_WRITE_FILE_CONTENT = false;
    const SHOULD_WRITE_HIGHLIGHTS = false;

    test('System prompt should be the same', async () => {
        const systemPath = path.resolve(__dirname, './data/system.txt');

        const prompt = new PromptProvider(Platform.Mac).system;
        if (SHOULD_WRITE_PROMPT) {
            await Bun.write(systemPath, prompt);
        }

        const existing = await Bun.file(systemPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Examples should be the same', async () => {
        const examplesPath = path.resolve(__dirname, './data/examples.txt');

        const prompt = new PromptProvider(Platform.Mac).example;
        if (SHOULD_WRITE_EXAMPLES) {
            await Bun.write(examplesPath, prompt);
        }

        const existing = await Bun.file(examplesPath).text();
        expect(prompt).toEqual(existing);
    });

    test('User message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user.txt');

        const prompt = new PromptProvider(Platform.Mac).getUserMessage('test', {
            files: [
                {
                    path: 'test.txt',
                    content: 'test',
                    language: 'typescript',
                    highlights: [],
                },
            ],
            highlights: [
                {
                    start: 1,
                    end: 2,
                    content: 'test',
                },
            ],
        });
        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('Empty message should be the same', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user-empty.txt');

        const prompt = new PromptProvider(Platform.Mac).getUserMessage('test', {
            files: [],
            highlights: [],
        });
        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('File content should be the same', async () => {
        const fileContentPath = path.resolve(__dirname, './data/file.txt');

        const prompt = new PromptProvider(Platform.Mac).getFilesContent([
            {
                path: 'test.txt',
                content: 'test',
                language: 'typescript',
                highlights: [],
            },
            {
                path: 'test2.txt',
                content: 'test2',
                language: 'typescript',
                highlights: [],
            },
        ]);

        if (SHOULD_WRITE_FILE_CONTENT) {
            await Bun.write(fileContentPath, prompt);
        }

        const existing = await Bun.file(fileContentPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Highlights should be the same', async () => {
        const highlightsPath = path.resolve(__dirname, './data/highlights.txt');

        const prompt = new PromptProvider(Platform.Mac).getHighlightsContent('test.txt', [
            { start: 1, end: 2, content: 'test' },
        ]);
        if (SHOULD_WRITE_HIGHLIGHTS) {
            await Bun.write(highlightsPath, prompt);
        }

        const existing = await Bun.file(highlightsPath).text();
        expect(prompt).toEqual(existing);
    });
});
