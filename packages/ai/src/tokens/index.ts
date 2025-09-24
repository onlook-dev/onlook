import { type TextUIPart, type ToolUIPart } from 'ai';
import { encode } from 'gpt-tokenizer';

import { type ChatMessage } from '@onlook/models';

export async function countTokensWithRoles(messages: ChatMessage[]): Promise<number> {
    const perMessageExtra = 4; // ~role + metadata tokens (OpenAI chat format)
    const perReplyExtra = 2; // for assistant reply priming
    let total = 0;
    for (const m of messages) {
        const content = m.parts
            .map((p) => {
                if (p.type === 'text') {
                    return p.text;
                } else if (p.type.startsWith('tool-')) {
                    return JSON.stringify((p as ToolUIPart).input); // TODO: check if this is correct
                }
                return '';
            })
            .join('');
        total += encode(content).length + perMessageExtra;
    }
    return total + perReplyExtra;
}
