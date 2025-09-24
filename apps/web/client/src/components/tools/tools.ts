import type { EditorEngine } from '@/components/store/editor/engine';
import type { ToolCall } from '@ai-sdk/provider-utils';
import { getToolClassesFromType } from '@onlook/ai';
import { toast } from '@onlook/ui/sonner';

export async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine, addToolResult: (toolResult: { tool: string, toolCallId: string, output: any }) => Promise<void>) {
    const toolName = toolCall.toolName;
    const currentChatMode = editorEngine.state.chatMode;
    const availableTools = getToolClassesFromType(currentChatMode);
    let output: any = null;

    try {
        const tool = availableTools.find(tool => tool.name === toolName);
        if (!tool) {
            toast.error(`Tool "${toolName}" not available in ask mode`, {
                description: `Switch to build mode to use this tool.`,
                duration: 2000,
            });

            throw new Error(`Tool "${toolName}" is not available in ${currentChatMode} mode`);
        }


        if (!tool) {
            throw new Error(`Unknown tool call: ${toolName}`);
        }
        output = await tool.handle(toolCall.input, editorEngine);
    } catch (error) {
        output = 'error handling tool call ' + error;
    } finally {
        void addToolResult({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: output,
        });
    }

}
