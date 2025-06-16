import { createClient } from '@/utils/supabase/request-server';
import { chatToolSet, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import type { MessageLimitCheckResult } from '@onlook/models/usage';
import { generateObject, NoSuchToolError, streamText } from 'ai';
import { type NextRequest } from 'next/server';

export enum ChatType {
    ASK = 'ask',
    CREATE = 'create',
    EDIT = 'edit',
    FIX = 'fix',
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSupabaseUser(req);
        if (!user) {
            return new Response(JSON.stringify({
                error: 'Unauthorized, no user found. Please login again.',
                code: 401
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const messageLimitCheckResult = await checkMessageLimit();
        if (messageLimitCheckResult.exceeded) {
            return new Response(JSON.stringify({
                error: 'Message limit exceeded. Please upgrade to a paid plan.',
                code: 402,
                limitInfo: messageLimitCheckResult
            }), {
                status: 402,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return streamResponse(req);
    } catch (error: any) {
        console.error('Error in chat', error);
        return new Response(JSON.stringify({
            error: 'Internal Server Error',
            code: 500,
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

const checkMessageLimit = async (): Promise<MessageLimitCheckResult> => {
    const count = 0;
    const limit = 10;
    const exceeded = count >= limit;

    return {
        exceeded,
        period: 'daily',
        count,
        limit,
    }
}

const getSupabaseUser = async (request: NextRequest) => {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

const streamResponse = async (req: NextRequest) => {
    const { messages, maxSteps, chatType } = await req.json();
    const provider = LLMProvider.ANTHROPIC;
    const { model, providerOptions } = await initModel(provider, CLAUDE_MODELS.SONNET_4);
    const systemPrompt = chatType === ChatType.CREATE ? getCreatePageSystemPrompt() : getSystemPrompt();

    const result = streamText({
        model,
        messages: [
            {
                role: 'system',
                content: systemPrompt,
                providerOptions,
            },
            ...messages,
        ],
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