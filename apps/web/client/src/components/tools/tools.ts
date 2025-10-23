import { getEditorEngine } from '@/components/store/editor';
import type { ToolCall } from '@ai-sdk/provider-utils';
import { getToolClassesFromType } from '@onlook/ai';
import { toast } from '@onlook/ui/sonner';

export async function handleToolCall(toolCall: ToolCall<string, unknown>, addToolResult: (toolResult: { tool: string, toolCallId: string, output: any }) => Promise<void>) {
    const toolName = toolCall.toolName;

    // Mock mode for performance testing - toggle via window.__ONLOOK_MOCK_TOOLS = true in browser console
    const MOCK_MODE = typeof window !== 'undefined' && (window as any).__ONLOOK_MOCK_TOOLS;
    if (MOCK_MODE) {
        console.log(`[MOCK] ${toolName} - returning instant mock result`);
        await addToolResult({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: { mocked: true, tool: toolName, message: 'Mock result - no actual operation performed' },
        });
        return;
    }

    const perfStart = performance.now();
    const editorEngine = getEditorEngine();
    const currentChatMode = editorEngine.state.chatMode;
    const availableTools = getToolClassesFromType(currentChatMode);
    let output: unknown = null;

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

        const handleStart = performance.now();
        // Can force type with as any because we know the input is valid.
        output = await toolInstance.handle(validatedInput as any, editorEngine);
        const handleDuration = performance.now() - handleStart;

        // Log performance if enabled
        if (typeof window !== 'undefined' && (window as any).__ONLOOK_PERF_LOG) {
            const totalDuration = performance.now() - perfStart;
            const overhead = totalDuration - handleDuration;
            console.log(`[PERF] ${toolName} total: ${totalDuration.toFixed(0)}ms (handle: ${handleDuration.toFixed(0)}ms, overhead: ${overhead.toFixed(0)}ms)`);
        }
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
