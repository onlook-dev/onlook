import { createClient as createTRPCClient } from '@/trpc/request-server';
import { createClient as createSupabaseClient } from '@/utils/supabase/request-server';
import { initModel } from '@onlook/ai';
import { LLMProvider, OPENROUTER_MODELS, type Usage } from '@onlook/models';
import { generateObject, NoSuchToolError, type ToolCall, type ToolSet } from 'ai';
import { type NextRequest } from 'next/server';

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

export const repairToolCall = async ({ toolCall, tools, error }: { toolCall: ToolCall<string, any>, tools: ToolSet, error: Error }) => {
    if (NoSuchToolError.isInstance(error)) {
        throw new Error(
            `Tool "${toolCall.toolName}" not found. Available tools: ${Object.keys(tools).join(', ')}`,
        );
    }
    const tool = tools[toolCall.toolName as keyof typeof tools];

    console.warn(
        `Invalid parameter for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}, attempting to fix`,
    );

    const { model } = await initModel({
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
    });

    const { object: repairedArgs } = await generateObject({
        model,
        schema: tool?.parameters,
        prompt: [
            `The model tried to call the tool "${toolCall.toolName}"` +
            ` with the following arguments:`,
            JSON.stringify(toolCall.args),
            `The tool accepts the following schema:`,
            JSON.stringify(tool?.parameters),
            'Please fix the arguments.',
        ].join('\n'),
    });

    return {
        ...toolCall,
        args: JSON.stringify(repairedArgs),
        toolCallType: 'function' as const
    };
}