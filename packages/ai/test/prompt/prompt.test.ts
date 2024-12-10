import { describe, expect, test } from 'bun:test';
import path from 'path';
import { Platform } from '../../src/prompt/platform';
import { PromptProvider } from '../../src/prompt/provider';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe('Prompt', () => {
    const SHOULD_WRITE_PROMPT = false;
    const SHOULD_WRITE_EXAMPLES = false;

    test('System prompt should be the same', async () => {
        const systemPath = path.resolve(__dirname, './data/system.txt');

        const prompt = new PromptProvider(Platform.Mac).getSystemPrompt();
        if (SHOULD_WRITE_PROMPT) {
            await Bun.write(systemPath, prompt);
        }

        const existing = await Bun.file(systemPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Examples should be the same', async () => {
        const examplesPath = path.resolve(__dirname, './data/examples.txt');

        const prompt = new PromptProvider(Platform.Mac).getExampleConversation();
        if (SHOULD_WRITE_EXAMPLES) {
            await Bun.write(examplesPath, prompt);
        }

        const existing = await Bun.file(examplesPath).text();
        expect(prompt).toEqual(existing);
    });
});
