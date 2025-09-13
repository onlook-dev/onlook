import type { EditorEngine } from '@/components/store/editor/engine';
import type { ToolCall } from '@ai-sdk/provider-utils';
import {
    BASH_EDIT_TOOL_NAME,
    BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_NAME,
    BASH_READ_TOOL_PARAMETERS,
    CHECK_ERRORS_TOOL_NAME,
    CHECK_ERRORS_TOOL_PARAMETERS,
    FUZZY_EDIT_FILE_TOOL_NAME,
    FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    getToolSetFromType,
    GLOB_TOOL_NAME,
    GLOB_TOOL_PARAMETERS,
    GREP_TOOL_NAME,
    GREP_TOOL_PARAMETERS,
    LIST_BRANCHES_TOOL_NAME,
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILE_TOOL_NAME,
    READ_FILE_TOOL_PARAMETERS,
    READ_STYLE_GUIDE_TOOL_NAME,
    SANDBOX_TOOL_NAME,
    SANDBOX_TOOL_PARAMETERS,
    SCRAPE_URL_TOOL_NAME,
    SCRAPE_URL_TOOL_PARAMETERS,
    SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
    SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_PARAMETERS,
    TYPECHECK_TOOL_NAME,
    TYPECHECK_TOOL_PARAMETERS,
    WEB_SEARCH_TOOL_NAME,
    WEB_SEARCH_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_NAME,
    WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { toast } from '@onlook/ui/sonner';
import { type z } from 'zod';
import {
    handleBashEditTool,
    handleBashReadTool,
    handleCheckErrors,
    handleFuzzyEditFileTool,
    handleGlobTool,
    handleGrepTool,
    handleListBranchesTool,
    handleListFilesTool,
    handleReadFileTool,
    handleReadStyleGuideTool,
    handleSandboxTool,
    handleScrapeUrlTool,
    handleSearchReplaceEditFileTool,
    handleTerminalCommandTool,
    handleTypecheckTool,
    handleWebSearchTool,
    handleWriteFileTool
} from './handlers';
import { EMPTY_TOOL_PARAMETERS } from './helpers';

interface ClientToolMap extends Record<string, {
    name: string;
    inputSchema: z.ZodObject<any>;
    handler: (args: any, editorEngine: EditorEngine) => Promise<any>;
}> { }

const TOOL_HANDLERS: ClientToolMap = {
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: {
        name: ONLOOK_INSTRUCTIONS_TOOL_NAME,
        inputSchema: EMPTY_TOOL_PARAMETERS,
        handler: async (_args: unknown, _editorEngine: EditorEngine) => ONLOOK_INSTRUCTIONS,
    },
    [WEB_SEARCH_TOOL_NAME]: {
        name: WEB_SEARCH_TOOL_NAME,
        inputSchema: WEB_SEARCH_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleWebSearchTool(args),
    },
    [SCRAPE_URL_TOOL_NAME]: {
        name: SCRAPE_URL_TOOL_NAME,
        inputSchema: SCRAPE_URL_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleScrapeUrlTool(args),
    },
    [LIST_FILES_TOOL_NAME]: {
        name: LIST_FILES_TOOL_NAME,
        inputSchema: LIST_FILES_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleListFilesTool(args, editorEngine),
    },
    [READ_FILE_TOOL_NAME]: {
        name: READ_FILE_TOOL_NAME,
        inputSchema: READ_FILE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof READ_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleReadFileTool(args, editorEngine),
    },
    [BASH_READ_TOOL_NAME]: {
        name: BASH_READ_TOOL_NAME,
        inputSchema: BASH_READ_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof BASH_READ_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleBashReadTool(args, editorEngine),
    },
    [READ_STYLE_GUIDE_TOOL_NAME]: {
        name: READ_STYLE_GUIDE_TOOL_NAME,
        inputSchema: EMPTY_TOOL_PARAMETERS,
        handler: async (args: unknown, editorEngine: EditorEngine) =>
            handleReadStyleGuideTool(editorEngine),
    },
    [LIST_BRANCHES_TOOL_NAME]: {
        name: LIST_BRANCHES_TOOL_NAME,
        inputSchema: EMPTY_TOOL_PARAMETERS,
        handler: async (args: unknown, editorEngine: EditorEngine) =>
            handleListBranchesTool(editorEngine),
    },
    [SEARCH_REPLACE_EDIT_FILE_TOOL_NAME]: {
        name: SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
        inputSchema: SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleSearchReplaceEditFileTool(args, editorEngine),
    },
    [WRITE_FILE_TOOL_NAME]: {
        name: WRITE_FILE_TOOL_NAME,
        inputSchema: WRITE_FILE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof WRITE_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleWriteFileTool(args, editorEngine),
    },
    [TERMINAL_COMMAND_TOOL_NAME]: {
        name: TERMINAL_COMMAND_TOOL_NAME,
        inputSchema: TERMINAL_COMMAND_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleTerminalCommandTool(args, editorEngine),
    },
    [SANDBOX_TOOL_NAME]: {
        name: SANDBOX_TOOL_NAME,
        inputSchema: SANDBOX_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof SANDBOX_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleSandboxTool(args, editorEngine),
    },
    [GLOB_TOOL_NAME]: {
        name: GLOB_TOOL_NAME,
        inputSchema: GLOB_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleGlobTool(args, editorEngine),
    },
    [GREP_TOOL_NAME]: {
        name: GREP_TOOL_NAME,
        inputSchema: GREP_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleGrepTool(args, editorEngine),
    },
    [BASH_EDIT_TOOL_NAME]: {
        name: BASH_EDIT_TOOL_NAME,
        inputSchema: BASH_EDIT_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleBashEditTool(args, editorEngine),
    },
    [FUZZY_EDIT_FILE_TOOL_NAME]: {
        name: FUZZY_EDIT_FILE_TOOL_NAME,
        inputSchema: FUZZY_EDIT_FILE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof FUZZY_EDIT_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleFuzzyEditFileTool(args, editorEngine),
    },
    [TYPECHECK_TOOL_NAME]: {
        name: TYPECHECK_TOOL_NAME,
        inputSchema: TYPECHECK_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof TYPECHECK_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleTypecheckTool(args, editorEngine),
    },
    [CHECK_ERRORS_TOOL_NAME]: {
        name: CHECK_ERRORS_TOOL_NAME,
        inputSchema: CHECK_ERRORS_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof CHECK_ERRORS_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleCheckErrors(args, editorEngine),
    },
};

export async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine) {
    try {
        const toolName = toolCall.toolName;

        const currentChatMode = editorEngine.state.chatMode;
        const availableTools = await getToolSetFromType(currentChatMode);

        if (!availableTools[toolName]) {
            toast.error(`Tool "${toolName}" not available in ask mode`, {
                description: `Switch to build mode to use this tool.`,
                duration: 2000,
            });

            throw new Error(`Tool "${toolName}" is not available in ${currentChatMode} mode`);
        }

        const clientTool = TOOL_HANDLERS[toolName];

        if (!clientTool) {
            throw new Error(`Unknown tool call: ${toolName}`);
        }

        return await clientTool.handler(toolCall.input, editorEngine);
    } catch (error) {
        console.error('Error handling tool call', error);
        return 'error handling tool call ' + error;
    }
}

