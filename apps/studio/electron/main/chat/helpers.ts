import { StreamReponseObject } from '@onlook/models/chat';
import { type DeepPartial } from 'ai';
import { Allow, parse } from 'partial-json';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function parseObjectFromText(
    text: string,
): DeepPartial<z.infer<typeof StreamReponseObject>> {
    const cleanedText = stripFullText(text);
    return parse(cleanedText, Allow.ALL) as DeepPartial<z.infer<typeof StreamReponseObject>>;
}

export function getFormatString() {
    const jsonFormat = JSON.stringify(zodToJsonSchema(StreamReponseObject));
    return `\nReturn your response only in this JSON format: <format>${jsonFormat}</format>`;
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
