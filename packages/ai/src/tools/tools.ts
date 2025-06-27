import { type ToolSet } from 'ai';
import {
    CREATE_FILE_TOOL_NAME,
    createFileTool,
    EDIT_FILE_TOOL_NAME,
    editFileTool,
    LIST_FILES_TOOL_NAME,
    listFilesTool,
    READ_FILES_TOOL_NAME,
    readFilesTool,
    TERMINAL_COMMAND_TOOL_NAME,
    terminalCommandTool,
} from './files';
import {
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    onlookInstructionsTool,
    READ_STYLE_GUIDE_TOOL_NAME,
    readStyleGuideTool,
} from './guides';

export const chatToolSet: ToolSet = {
    [LIST_FILES_TOOL_NAME]: listFilesTool,
    [READ_FILES_TOOL_NAME]: readFilesTool,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: onlookInstructionsTool,
    [READ_STYLE_GUIDE_TOOL_NAME]: readStyleGuideTool,
    [EDIT_FILE_TOOL_NAME]: editFileTool,
    [CREATE_FILE_TOOL_NAME]: createFileTool,
    [TERMINAL_COMMAND_TOOL_NAME]: terminalCommandTool,
};
