import { useEditorEngine } from '@/components/store/editor';
import type { EditorEngine } from '@/components/store/editor/engine';
import { api } from '@/trpc/client';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import {
    CREATE_FILE_TOOL_NAME,
    CREATE_FILE_TOOL_PARAMETERS,
    EDIT_FILE_TOOL_NAME,
    EDIT_FILE_TOOL_PARAMETERS,
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_FILES_TOOL_PARAMETERS,
    READ_STYLE_GUIDE_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_PARAMETERS
} from '@onlook/ai';
import { ChatType } from '@onlook/models';
import type { Message, ToolCall } from 'ai';
import { createContext, useContext } from 'react';
import { z } from 'zod';

type ExtendedUseChatHelpers = UseChatHelpers & { sendMessages: (messages: Message[], type: ChatType) => Promise<string | null | undefined> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 10,
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, config) => {
            if (config.finishReason === 'stop' || config.finishReason === 'error') {
                editorEngine.chat.conversation.addAssistantMessage(message);
                if (config.finishReason === 'stop') {
                    editorEngine.chat.context.clearAttachments();
                }
            }
        },
        onError: (error) => {
            console.error('Error in chat', error);
            editorEngine.chat.error.handleChatError(error);
        },
    });

    const sendMessages = async (messages: Message[], type: ChatType = ChatType.EDIT) => {
        editorEngine.chat.error.clear();
        chat.setMessages(messages);
        return chat.reload({
            body: {
                chatType: type,
            },
        });
    };

    return <ChatContext.Provider value={{ ...chat, sendMessages }}>{children}</ChatContext.Provider>;
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
            return await handleListFilesTool(
                toolCall.args as z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
        } else if (toolName === READ_FILES_TOOL_NAME) {
            return await handleReadFilesTool(
                toolCall.args as z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
        } else if (toolName === READ_STYLE_GUIDE_TOOL_NAME) {
            const result = await handleReadStyleGuideTool(editorEngine);
            return result;
        } else if (toolName === ONLOOK_INSTRUCTIONS_TOOL_NAME) {
            const result = ONLOOK_INSTRUCTIONS;
            return result;
        } else if (toolName === EDIT_FILE_TOOL_NAME) {
            return await handleEditFileTool(
                toolCall.args as z.infer<typeof EDIT_FILE_TOOL_PARAMETERS>,
                editorEngine,
            );
        } else if (toolName === CREATE_FILE_TOOL_NAME) {
            return await handleCreateFileTool(
                toolCall.args as z.infer<typeof CREATE_FILE_TOOL_PARAMETERS>,
                editorEngine,
            );
        } else if (toolName === TERMINAL_COMMAND_TOOL_NAME) {
            return await handleTerminalCommandTool(
                toolCall.args as z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>,
                editorEngine,
            );
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

async function handleReadStyleGuideTool(editorEngine: EditorEngine) {
    const result = await editorEngine.theme.initializeTailwindColorContent();
    if (!result) {
        throw new Error('Style guide files not found');
    }
    return result;
}

async function handleEditFileTool(
    args: z.infer<typeof EDIT_FILE_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<string> {
    const exists = await editorEngine.sandbox.fileExists(args.path);
    if (!exists) {
        throw new Error('File does not exist');
    }
    const originalContent = await editorEngine.sandbox.readFile(args.path);

    if (!originalContent) {
        throw new Error('Error reading file');
    }
    const updatedContent = await api.code.applyDiff.mutate({
        originalCode: originalContent,
        updateSnippet: args.content,
    });
    if (!updatedContent.result) {
        throw new Error('Error applying code change: ' + updatedContent.error);
    }

    const result = await editorEngine.sandbox.writeFile(args.path, updatedContent.result);
    if (!result) {
        throw new Error('Error editing file');
    }
    return 'File edited!';
}

async function handleCreateFileTool(
    args: z.infer<typeof CREATE_FILE_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    const exists = await editorEngine.sandbox.fileExists(args.path);
    if (exists) {
        throw new Error('File already exists');
    }
    const result = await editorEngine.sandbox.writeFile(args.path, args.content);
    if (!result) {
        throw new Error('Error creating file');
    }
    return 'File created!';
}

async function handleTerminalCommandTool(
    args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    return 'Terminal command executed!';
}