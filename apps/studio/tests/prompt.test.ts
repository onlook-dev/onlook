import { MOCK_USER_MSG } from '@/lib/editor/engine/chat/mockData';
import { describe, it } from 'bun:test';
import { getSystemMessagePrompt } from '../electron/main/chat/helpers';

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
