import type { EditorEngine } from '@/components/store/editor/engine';
import type { ToolCall } from '@ai-sdk/provider-utils';
import type { AbstractChat } from 'ai';
import { getAvailableTools, type OnToolCallHandler } from '@onlook/ai';
import { toast } from '@onlook/ui/sonner';
import type { AgentType } from '@onlook/models';

export async function handleToolCall(agentType: AgentType, toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine, addToolResult: typeof AbstractChat.prototype.addToolResult) {
    const toolName = toolCall.toolName;
    const currentChatMode = editorEngine.state.chatMode;
    const availableTools = getAvailableTools(agentType, currentChatMode) as any[];
    let output: any = null;

    try {
        const tool = availableTools.find((tool: any) => tool.toolName === toolName);
        if (!tool) {
            toast.error(`Tool "${toolName}" not available in ask mode`, {
                description: `Switch to build mode to use this tool.`,
                duration: 2000,
            });

            throw new Error(`Tool "${toolName}" is not available in ${currentChatMode} mode!!!!`);
        }
        // Parse the input to the tool parameters. Throws if invalid.
        const validatedInput = tool.parameters.parse(toolCall.input);
        const toolInstance = new tool();
        const getOnToolCall: OnToolCallHandler = (subAgentType, addSubAgentToolResult) => (toolCall) =>
            void handleToolCall(subAgentType, toolCall.toolCall, editorEngine, addSubAgentToolResult);

        // Can force type with as any because we know the input is valid.
        output = await toolInstance.handle(validatedInput as any, editorEngine, getOnToolCall);
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
