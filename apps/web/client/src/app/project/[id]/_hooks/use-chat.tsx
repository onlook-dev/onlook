// Required context in order to use the useChat hook

import { useEditorEngine } from '@/components/store/editor';
import type { EditorEngine } from '@/components/store/editor/engine';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import {
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_FILES_TOOL_PARAMETERS,
} from '@onlook/ai';
import type { ToolCall } from 'ai';
import { createContext, useContext } from 'react';
import { z } from 'zod';

const ChatContext = createContext<UseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 10,
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, config) => {
            if (config.finishReason === 'stop') {
                editorEngine.chat.conversation.addAssistantMessage(message);
            }
        },
        onError: (error) => {
            console.error('Error in chat', error);
        },
    });
    return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}

async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine) {
    try {
        const toolName = toolCall.toolName;
        if (toolName === LIST_FILES_TOOL_NAME) {
            const result = await handleListFilesTool(
                toolCall.args as z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
            return result;
        } else if (toolName === READ_FILES_TOOL_NAME) {
            const result = await handleReadFilesTool(
                toolCall.args as z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
            return result;
        } else if (toolName === ONLOOK_INSTRUCTIONS_TOOL_NAME) {
            const result = ONLOOK_INSTRUCTIONS;
            return result;
        } else {
            throw new Error(`Unknown tool call: ${toolCall.toolName}`);
        }
    } catch (error) {
        console.error('Error handling tool call', error);
        return 'error handling tool call ' + error;
    }
}

async function handleListFilesTool(
    args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    const result = await editorEngine.sandbox.listFiles(args.path);
    if (!result) {
        throw new Error('Error listing files');
    }
    return result;
}

async function handleReadFilesTool(
    args: z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    const result = await editorEngine.sandbox.readFiles(args.paths);
    if (!result) {
        throw new Error('Error reading files');
    }
    return result;
}
