import type { ToolCall } from '@ai-sdk/provider-utils';
import { ASK_TOOL_SET, BUILD_TOOL_SET, getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { generateObject, NoSuchToolError, type ToolSet } from 'ai';

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


export const repairToolCall = async ({ toolCall, tools, error }: { toolCall: ToolCall<string, unknown>, tools: ToolSet, error: Error }) => {
    if (NoSuchToolError.isInstance(error)) {
        throw new Error(
            `Tool "${toolCall.toolName}" not found. Available tools: ${Object.keys(tools).join(', ')}`,
        );
    }
    const tool = tools[toolCall.toolName];

    if (!tool?.inputSchema) {
        throw new Error(`Tool "${toolCall.toolName}" has no input schema`);
    }

    console.warn(
        `Invalid parameter for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.input)}, attempting to fix`,
    );

    const { model } = await initModel({
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO,
    });

    const { object: repairedArgs } = await generateObject({
        model,
        schema: tool.inputSchema,
        prompt: [
            `The model tried to call the tool "${toolCall.toolName}"` +
            ` with the following arguments:`,
            JSON.stringify(toolCall.input),
            `The tool accepts the following schema:`,
            JSON.stringify(tool?.inputSchema),
            'Please fix the inputs. Return the fixed inputs as a JSON object, DO NOT include any other text.',
        ].join('\n'),
    });

    return {
        type: 'tool-call' as const,
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: JSON.stringify(repairedArgs),
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
