import { MOCK_USER_MSG } from '@/lib/editor/engine/chat/mockData';
import { getSystemMessagePrompt } from '@/lib/editor/engine/chat/prompt';
import { describe, it } from 'bun:test';

describe('Prompt', () => {
    it('getSystemMessagePrompt', () => {
        const prompt = getSystemMessagePrompt();
        console.log(prompt);
    });

    it('userPrompt', () => {
        const prompt = MOCK_USER_MSG.toCurrentMessage();
        console.log(prompt.content);
    });
});
