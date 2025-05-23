import { chatToolSet, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateObject, NoSuchToolError, streamText } from 'ai';

export enum ChatType {
    ASK = 'ask',
    CREATE = 'create',
    EDIT = 'edit',
}

const model = await initModel(LLMProvider.ANTHROPIC, CLAUDE_MODELS.SONNET_4);

export async function POST(req: Request) {
    const { messages, maxSteps, chatType } = await req.json();

    const systemPrompt = chatType === ChatType.CREATE ? getCreatePageSystemPrompt() : getSystemPrompt();

    const result = streamText({
        model,
        system: systemPrompt,
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
