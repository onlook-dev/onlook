import { createClient as createTRPCClient } from '@/trpc/request-server';
import { createClient as createSupabaseClient } from '@/utils/supabase/request-server';
import { askToolSet, buildToolSet, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, CLAUDE_MODELS, LLMProvider, type Usage, UsageType } from '@onlook/models';
import { generateObject, NoSuchToolError, streamText } from 'ai';
import { type NextRequest } from 'next/server';

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

        const usageCheckResult = await checkMessageLimit(req);
        if (usageCheckResult.exceeded) {
            return new Response(JSON.stringify({
                error: 'Message limit exceeded. Please upgrade to a paid plan.',
                code: 402,
                usage: usageCheckResult.usage,
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

export const checkMessageLimit = async (req: NextRequest): Promise<{
    exceeded: boolean;
    usage: Usage;
}> => {
    const { api } = await createTRPCClient(req);
    const usage = await api.usage.get();

    const dailyUsage = usage.daily;
    const dailyExceeded = dailyUsage.usageCount >= dailyUsage.limitCount;
    if (dailyExceeded) {
        return {
            exceeded: true,
            usage: dailyUsage,
        };
    }

    const monthlyUsage = usage.monthly;
    const monthlyExceeded = monthlyUsage.usageCount >= monthlyUsage.limitCount;
    if (monthlyExceeded) {
        return {
            exceeded: true,
            usage: monthlyUsage,
        };
    }

    return {
        exceeded: false,
        usage: monthlyUsage,
    };
}

export const getSupabaseUser = async (request: NextRequest) => {
    const supabase = await createSupabaseClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export const streamResponse = async (req: NextRequest) => {
    const { messages, maxSteps, chatType } = await req.json();
    const { model, providerOptions } = await initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.SONNET_4,
    });

    let systemPrompt: string;
    switch (chatType) {
        case ChatType.CREATE:
            systemPrompt = getCreatePageSystemPrompt();
            break;
        case ChatType.ASK:
            systemPrompt = getAskModeSystemPrompt();
            break;
        case ChatType.EDIT:
        default:
            systemPrompt = getSystemPrompt();
            break;
    }
    const toolSet = chatType === ChatType.ASK ? askToolSet : buildToolSet;
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
        tools: toolSet,
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

    try {
        if (chatType === ChatType.EDIT) {
            const user = await getSupabaseUser(req);
            if (!user) {
                throw new Error('User not found');
            }
            const { api } = await createTRPCClient(req);
            await api.usage.increment({
                type: UsageType.MESSAGE,
            });
        }
    } catch (error) {
        console.error('Error in chat usage increment', error);
    }

    return result.toDataStreamResponse();
}
