import type { TextUIPart } from 'ai';
import { type ChatMessage } from '@onlook/models';
import { encode } from 'gpt-tokenizer';

export async function countTokensWithRoles(messages: ChatMessage[]): Promise<number> {
    const perMessageExtra = 4; // ~role + metadata tokens (OpenAI chat format)
    const perReplyExtra = 2; // for assistant reply priming
    let total = 0;
    for (const m of messages) {
        const content = m.content.parts
            .map((p) => {
                if (p.type === 'text') {
                    return (p as TextUIPart).text;
                } else if (p.type === 'tool-invocation') {
                    return JSON.stringify(p);
                }
                return '';
            })
            .join('');
        total += encode(content).length + perMessageExtra;
    }
    return total + perReplyExtra;
}
