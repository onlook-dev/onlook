import { chatToolSet, CRAWL_URL_TOOL_NAME, initModel, PromptProvider } from '@onlook/ai';
import { extractUrls } from '@onlook/ai/src/tools/helpers';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateObject, NoSuchToolError, streamText } from 'ai';

const model = await initModel(LLMProvider.ANTHROPIC, CLAUDE_MODELS.SONNET);
const promptProvider = new PromptProvider();

async function processUrls(content: string): Promise<string> {
    const urls = extractUrls(content);

    if (urls.length === 0) {
        return content;
    }

    try {
        const result = await streamText({
            model,
            system: promptProvider.getSystemPrompt(),
            messages: [
                {
                    role: 'user',
                    content: content,
                },
            ],
            tools: { [CRAWL_URL_TOOL_NAME]: chatToolSet[CRAWL_URL_TOOL_NAME] as any },
            maxTokens: 4000,
        });

        return `
        Original request:
        ${content}

        Referenced content from URLs:
        ${JSON.stringify(result, null, 2)}
        `;
    } catch (error) {
        console.error('Error processing URLs:', error);
        return content;
    }
}

export async function POST(req: Request) {
    const { messages, maxSteps } = await req.json();
    
    const lastUserMessage = messages.findLast((m: any) => m.role === 'user');
    if (lastUserMessage && typeof lastUserMessage.content === 'string') {
        lastUserMessage.content = await processUrls(lastUserMessage.content);
    }

    const result = streamText({
        model,
        system: promptProvider.getSystemPrompt(),
        messages,
        maxSteps,
        tools: chatToolSet,
        toolCallStreaming: true,
        maxTokens: 64000,
        experimental_repairToolCall: async ({ toolCall, tools, parameterSchema, error }) => {
            if (NoSuchToolError.isInstance(error)) {
                throw new Error(
                    `Tool "${toolCall.toolName}" not found. Available tools: ${Object.keys(tools).join(', ')}`,
                );
            }
            const tool = tools[toolCall.toolName as keyof typeof tools];

            console.warn(
                `Invalid parameter for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}, attempting to fix`,
            );

            const { object: repairedArgs } = await generateObject({
                model,
                schema: tool?.parameters,
                prompt: [
                    `The model tried to call the tool "${toolCall.toolName}"` +
                    ` with the following arguments:`,
                    JSON.stringify(toolCall.args),
                    `The tool accepts the following schema:`,
                    JSON.stringify(parameterSchema(toolCall)),
                    'Please fix the arguments.',
                ].join('\n'),
            });

            return { ...toolCall, args: JSON.stringify(repairedArgs) };
        },
        onError: (error) => {
            console.error('Error in chat', error);
        },
    });

    return result.toDataStreamResponse();
}
