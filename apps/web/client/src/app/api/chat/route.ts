import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function POST(req: Request) {
    const { messages } = await req.json();
    console.log(messages);
    const result = streamText({
        model: anthropic('claude-3-7-sonnet-20250219'),
        messages,
    });
    return result.toDataStreamResponse();
}