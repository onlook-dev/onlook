import { StreamReponseSchema, type StreamResponse } from '@onlook/models/chat';
import { Allow, parse } from 'partial-json';
import type { PartialDeep } from 'type-fest';
import { create } from 'xmlbuilder2';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { XML_END_OPTIONS } from '/common/prompt';

export function getSystemMessagePrompt(): string {
    const instruction =
        'You are an expert React and Tailwind developer tasked with modifying code based on given instructions. Your goal is to analyze the provided code, understand the requested modifications, and implement them accurately while explaining your thought process.';
    return instruction + '\n' + getFormatString();
}

export function getFormatString() {
    const jsonFormat = JSON.stringify(zodToJsonSchema(StreamReponseSchema), null, 2);
    return create().ele('format').txt(jsonFormat).end(XML_END_OPTIONS);
}

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
