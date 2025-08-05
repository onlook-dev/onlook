import type { EditorEngine } from '@/components/store/editor/engine';
import {
    BASH_EDIT_TOOL_NAME,
    BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_NAME,
    BASH_READ_TOOL_PARAMETERS,
    CREATE_FILE_TOOL_NAME,
    CREATE_FILE_TOOL_PARAMETERS,
    EDIT_FILE_TOOL_NAME,
    EDIT_FILE_TOOL_PARAMETERS,
    EDIT_TOOL_NAME,
    EDIT_TOOL_PARAMETERS,
    EXIT_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_PARAMETERS,
    GLOB_TOOL_NAME,
    GLOB_TOOL_PARAMETERS,
    GREP_TOOL_NAME,
    GREP_TOOL_PARAMETERS,
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    LS_TOOL_NAME,
    LS_TOOL_PARAMETERS,
    MULTI_EDIT_TOOL_NAME,
    MULTI_EDIT_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_FILES_TOOL_PARAMETERS,
    READ_STYLE_GUIDE_TOOL_NAME,
    READ_TOOL_NAME,
    READ_TOOL_PARAMETERS,
    SANDBOX_TOOL_NAME,
    SANDBOX_TOOL_PARAMETERS,
    SCRAPE_URL_TOOL_NAME,
    SCRAPE_URL_TOOL_PARAMETERS,
    TASK_TOOL_NAME,
    TASK_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_PARAMETERS,
    TODO_WRITE_TOOL_NAME,
    TODO_WRITE_TOOL_PARAMETERS,
    WEB_FETCH_TOOL_NAME,
    WEB_FETCH_TOOL_PARAMETERS,
    WEB_SEARCH_TOOL_NAME,
    WEB_SEARCH_TOOL_PARAMETERS,
    WRITE_TOOL_NAME,
    WRITE_TOOL_PARAMETERS
} from '@onlook/ai';
import type { ToolCall } from 'ai';
import { z } from 'zod';
import {
    handleBashEditTool,
    handleEditTool,
    handleExitPlanModeTool,
    handleMultiEditTool,
    handleTodoWriteTool,
    handleWriteTool
} from './handlers/edit';
import { handleCreateFileTool, handleEditFileTool, handleListFilesTool, handleReadFilesTool, handleReadStyleGuideTool, handleSandboxTool, handleScrapeUrlTool, handleTerminalCommandTool } from './handlers/legacy';
import {
    handleBashReadTool,
    handleGlobTool,
    handleGrepTool,
    handleLsTool,
    handleReadTool,
    handleTaskTool,
    handleWebFetchTool,
    handleWebSearchTool,
} from './handlers/read';
import { EMPTY_TOOL_PARAMETERS } from './helpers';

interface ClientToolMap extends Record<string, {
    name: string;
    parameters: z.ZodObject<any>;
    handler: (args: any, editorEngine: EditorEngine) => Promise<any>;
}> { }

const TOOL_HANDLERS: ClientToolMap = {
    // Primary Onlook tools (enhanced functionality)
    [LIST_FILES_TOOL_NAME]: {
        name: LIST_FILES_TOOL_NAME,
        parameters: LIST_FILES_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleListFilesTool(args, editorEngine),
    },
    [READ_FILES_TOOL_NAME]: {
        name: READ_FILES_TOOL_NAME,
        parameters: READ_FILES_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof READ_FILES_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleReadFilesTool(args, editorEngine),
    },
    [READ_STYLE_GUIDE_TOOL_NAME]: {
        name: READ_STYLE_GUIDE_TOOL_NAME,
        parameters: EMPTY_TOOL_PARAMETERS,
        handler: async (editorEngine: EditorEngine) =>
            handleReadStyleGuideTool(editorEngine),
    },
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: {
        name: ONLOOK_INSTRUCTIONS_TOOL_NAME,
        parameters: EMPTY_TOOL_PARAMETERS,
        handler: async () =>
            ONLOOK_INSTRUCTIONS,
    },
    [EDIT_FILE_TOOL_NAME]: {
        name: EDIT_FILE_TOOL_NAME,
        parameters: EDIT_FILE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof EDIT_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleEditFileTool(args, editorEngine),
    },
    [CREATE_FILE_TOOL_NAME]: {
        name: CREATE_FILE_TOOL_NAME,
        parameters: CREATE_FILE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof CREATE_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleCreateFileTool(args, editorEngine),
    },
    [TERMINAL_COMMAND_TOOL_NAME]: {
        name: TERMINAL_COMMAND_TOOL_NAME,
        parameters: TERMINAL_COMMAND_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleTerminalCommandTool(args, editorEngine),
    },
    [SCRAPE_URL_TOOL_NAME]: {
        name: SCRAPE_URL_TOOL_NAME,
        parameters: SCRAPE_URL_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleScrapeUrlTool(args),
    },
    [SANDBOX_TOOL_NAME]: {
        name: SANDBOX_TOOL_NAME,
        parameters: SANDBOX_TOOL_PARAMETERS,
        handler: async (editorEngine: EditorEngine) =>
            handleSandboxTool(editorEngine),
    },
    [TASK_TOOL_NAME]: {
        name: TASK_TOOL_NAME,
        parameters: TASK_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof TASK_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleTaskTool(args, editorEngine),
    },
    [BASH_READ_TOOL_NAME]: {
        name: BASH_READ_TOOL_NAME,
        parameters: BASH_READ_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof BASH_READ_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleBashReadTool(args, editorEngine),
    },
    [GLOB_TOOL_NAME]: {
        name: GLOB_TOOL_NAME,
        parameters: GLOB_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleGlobTool(args, editorEngine),
    },
    [GREP_TOOL_NAME]: {
        name: GREP_TOOL_NAME,
        parameters: GREP_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleGrepTool(args, editorEngine),
    },
    [LS_TOOL_NAME]: {
        name: LS_TOOL_NAME,
        parameters: LS_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof LS_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleLsTool(args, editorEngine),
    },
    [READ_TOOL_NAME]: {
        name: READ_TOOL_NAME,
        parameters: READ_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof READ_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleReadTool(args, editorEngine),
    },
    [WEB_FETCH_TOOL_NAME]: {
        name: WEB_FETCH_TOOL_NAME,
        parameters: WEB_FETCH_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof WEB_FETCH_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleWebFetchTool(args, editorEngine),
    },
    [WEB_SEARCH_TOOL_NAME]: {
        name: WEB_SEARCH_TOOL_NAME,
        parameters: WEB_SEARCH_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleWebSearchTool(args, editorEngine),
    },
    // Edit tools (direct handlers)
    [BASH_EDIT_TOOL_NAME]: {
        name: BASH_EDIT_TOOL_NAME,
        parameters: BASH_EDIT_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleBashEditTool(args, editorEngine),
    },
    [EDIT_TOOL_NAME]: {
        name: EDIT_TOOL_NAME,
        parameters: EDIT_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleEditTool(args, editorEngine),
    },
    [MULTI_EDIT_TOOL_NAME]: {
        name: MULTI_EDIT_TOOL_NAME,
        parameters: MULTI_EDIT_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof MULTI_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleMultiEditTool(args, editorEngine),
    },
    [WRITE_TOOL_NAME]: {
        name: WRITE_TOOL_NAME,
        parameters: WRITE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof WRITE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleWriteTool(args, editorEngine),
    },
    [TODO_WRITE_TOOL_NAME]: {
        name: TODO_WRITE_TOOL_NAME,
        parameters: TODO_WRITE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleTodoWriteTool(args, editorEngine),
    },
    [EXIT_PLAN_MODE_TOOL_NAME]: {
        name: EXIT_PLAN_MODE_TOOL_NAME,
        parameters: EXIT_PLAN_MODE_TOOL_PARAMETERS,
        handler: async (args: z.infer<typeof EXIT_PLAN_MODE_TOOL_PARAMETERS>, editorEngine: EditorEngine) =>
            handleExitPlanModeTool(args, editorEngine),
    },
};

export async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine) {
    try {
        const toolName = toolCall.toolName;
        const clientTool = TOOL_HANDLERS[toolName];

        if (!clientTool) {
            throw new Error(`Unknown tool call: ${toolName}`);
        }

        return await clientTool.handler(toolCall.args, editorEngine);
    } catch (error) {
        console.error('Error handling tool call', error);
        return 'error handling tool call ' + error;
    }
}
