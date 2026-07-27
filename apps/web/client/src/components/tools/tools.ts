import type { EditorEngine } from '@/components/store/editor/engine';
import type { ToolCall } from '@ai-sdk/provider-utils';
import { type AddToolResult, createToolErrorResult, getToolClassesFromType } from '@onlook/ai';
import { toast } from '@onlook/ui/sonner';

export async function handleToolCall(
    toolCall: ToolCall<string, unknown>,
    editorEngine: EditorEngine,
    addToolResult: AddToolResult,
) {
    const toolName = toolCall.toolName;
    const currentChatMode = editorEngine.state.chatMode;
    const availableTools = getToolClassesFromType(currentChatMode);

    try {
        const tool = availableTools.find(tool => tool.toolName === toolName);
        if (!tool) {
            toast.error(`Tool "${toolName}" not available in ask mode`, {
                description: `Switch to build mode to use this tool.`,
                duration: 2000,
            });

            throw new Error(`Tool "${toolName}" is not available in ${currentChatMode} mode`);
        }
        // Parse the input to the tool parameters. Throws if invalid.
        const validatedInput = tool.parameters.parse(toolCall.input);
        const toolInstance = new tool();
        // Can force type with as any because we know the input is valid.
        const output = await toolInstance.handle(validatedInput as any, editorEngine);
        await addToolResult({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output,
        });
    } catch (error) {
        await addToolResult(createToolErrorResult(toolName, toolCall.toolCallId, error));
    }
}
