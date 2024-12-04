import { type StreamResponse } from '@onlook/models/chat';
import { Allow, parse } from 'partial-json';
import type { PartialDeep } from 'type-fest';

export function parseObjectFromText(text: string): PartialDeep<StreamResponse> {
    const cleanedText = stripFullText(text);
    return parse(cleanedText, Allow.ALL) as PartialDeep<StreamResponse>;
}

export function stripFullText(fullText: string) {
    let text = fullText;

    if (text.startsWith('```')) {
        text = text.slice(3);
    }

    if (text.startsWith('```json\n')) {
        text = text.slice(8);
    }

    if (text.endsWith('```')) {
        text = text.slice(0, -3);
    }
    return text;
}
