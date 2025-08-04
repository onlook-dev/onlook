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
    SANDBOX_TOOL_NAME,
    sandboxTool,
    TERMINAL_COMMAND_TOOL_NAME,
    terminalCommandTool,
} from './files';
import {
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    onlookInstructionsTool,
    READ_STYLE_GUIDE_TOOL_NAME,
    readStyleGuideTool,
} from './guides';
import { SCRAPE_URL_TOOL_NAME, scrapeUrlTool } from './web';
import {
    // Read-only tools for askToolSet
    TASK_TOOL_NAME,
    taskTool,
    BASH_READ_TOOL_NAME,
    bashReadTool,
    GLOB_TOOL_NAME,
    globTool,
    GREP_TOOL_NAME,
    grepTool,
    LS_ENHANCED_TOOL_NAME,
    lsEnhancedTool,
    READ_ENHANCED_TOOL_NAME,
    readEnhancedTool,
    NOTEBOOK_READ_TOOL_NAME,
    notebookReadTool,
    WEB_FETCH_TOOL_NAME,
    webFetchTool,
    WEB_SEARCH_TOOL_NAME,
    webSearchTool,
    // Edit tools for buildToolSet
    BASH_EDIT_TOOL_NAME,
    bashEditTool,
    EDIT_ENHANCED_TOOL_NAME,
    editEnhancedTool,
    MULTI_EDIT_TOOL_NAME,
    multiEditTool,
    WRITE_ENHANCED_TOOL_NAME,
    writeEnhancedTool,
    NOTEBOOK_EDIT_TOOL_NAME,
    notebookEditTool,
    TODO_WRITE_TOOL_NAME,
    todoWriteTool,
    EXIT_PLAN_MODE_TOOL_NAME,
    exitPlanModeTool,
} from './enhanced-tools';

export const buildToolSet: ToolSet = {
    // Core Onlook editing tools (preferred)
    [LIST_FILES_TOOL_NAME]: listFilesTool,
    [READ_FILES_TOOL_NAME]: readFilesTool,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: onlookInstructionsTool,
    [READ_STYLE_GUIDE_TOOL_NAME]: readStyleGuideTool,
    [EDIT_FILE_TOOL_NAME]: editFileTool,
    [CREATE_FILE_TOOL_NAME]: createFileTool,
    [TERMINAL_COMMAND_TOOL_NAME]: terminalCommandTool,
    [SCRAPE_URL_TOOL_NAME]: scrapeUrlTool,
    [SANDBOX_TOOL_NAME]: sandboxTool,
    // Enhanced editing tools (additional capabilities)
    [BASH_EDIT_TOOL_NAME]: bashEditTool,
    [EDIT_ENHANCED_TOOL_NAME]: editEnhancedTool,
    [MULTI_EDIT_TOOL_NAME]: multiEditTool,
    [WRITE_ENHANCED_TOOL_NAME]: writeEnhancedTool,
    [NOTEBOOK_EDIT_TOOL_NAME]: notebookEditTool,
    [TODO_WRITE_TOOL_NAME]: todoWriteTool,
    [EXIT_PLAN_MODE_TOOL_NAME]: exitPlanModeTool,
};

export const askToolSet: ToolSet = {
    // Core Onlook read-only tools (preferred)
    [LIST_FILES_TOOL_NAME]: listFilesTool,
    [READ_FILES_TOOL_NAME]: readFilesTool,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: onlookInstructionsTool,
    [READ_STYLE_GUIDE_TOOL_NAME]: readStyleGuideTool,
    [SCRAPE_URL_TOOL_NAME]: scrapeUrlTool,
    // Enhanced read-only tools (additional capabilities)
    [TASK_TOOL_NAME]: taskTool,
    [BASH_READ_TOOL_NAME]: bashReadTool,
    [GLOB_TOOL_NAME]: globTool,
    [GREP_TOOL_NAME]: grepTool,
    [LS_ENHANCED_TOOL_NAME]: lsEnhancedTool,
    [READ_ENHANCED_TOOL_NAME]: readEnhancedTool,
    [NOTEBOOK_READ_TOOL_NAME]: notebookReadTool,
    [WEB_FETCH_TOOL_NAME]: webFetchTool,
    [WEB_SEARCH_TOOL_NAME]: webSearchTool,
};
