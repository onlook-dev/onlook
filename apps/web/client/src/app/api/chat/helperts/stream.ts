import { ASK_TOOL_SET, BUILD_TOOL_SET, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { generateObject, NoSuchToolError, type ToolCall, type ToolSet } from 'ai';

export async function getModelFromType(chatType: ChatType) {
    let model: ModelConfig;
    switch (chatType) {
        case ChatType.CREATE:
        case ChatType.FIX:
            model = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
            });
            break;
        case ChatType.ASK:
        case ChatType.EDIT:
        default:
            model = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
            });
            break;
    }
    return model;
}

export async function getToolSetFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? ASK_TOOL_SET : BUILD_TOOL_SET;
}

export async function getSystemPromptFromType(chatType: ChatType) {
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
    return systemPrompt;
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

export function errorHandler(error: unknown) {
    try {
        console.error('Error in chat', error);
        if (!error) {
            return 'unknown error';
        }

        if (typeof error === 'string') {
            return error;
        }

        if (error instanceof Error) {
            return error.message;
        }
        return JSON.stringify(error);
    } catch (error) {
        console.error('Error in errorHandler', error);
        return 'unknown error';
    }
}
