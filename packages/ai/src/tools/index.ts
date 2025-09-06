export * from './branch';
export * from './cli';
export * from './edit';
export * from './errors';
export * from './guides';
export * from './plan';
export * from './read';
export * from './sandbox';
export * from './web';

import { type ToolSet } from 'ai';
import {
    BASH_EDIT_TOOL_NAME,
    BASH_READ_TOOL_NAME,
    bashEditTool,
    bashReadTool,
    FUZZY_EDIT_FILE_TOOL_NAME,
    fuzzyEditFileTool,
    GLOB_TOOL_NAME,
    globTool,
    GREP_TOOL_NAME,
    grepTool,
    LIST_BRANCHES_TOOL_NAME,
    LIST_FILES_TOOL_NAME,
    listBranchesTool,
    listFilesTool,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    onlookInstructionsTool,
    READ_FILE_TOOL_NAME,
    READ_STYLE_GUIDE_TOOL_NAME,
    readFileTool,
    readStyleGuideTool,
    SANDBOX_TOOL_NAME,
    sandboxTool,
    SCRAPE_URL_TOOL_NAME,
    scrapeUrlTool,
    SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME,
    searchReplaceEditFileTool,
    searchReplaceMultiEditFileTool,
    TERMINAL_COMMAND_TOOL_NAME,
    terminalCommandTool,
    TYPECHECK_TOOL_NAME,
    typecheckTool,
    WEB_SEARCH_TOOL_NAME,
    webSearchTool,
    WRITE_FILE_TOOL_NAME,
    writeFileTool,
} from './';

export const ASK_TOOL_SET: ToolSet = {
    [LIST_FILES_TOOL_NAME]: listFilesTool,
    [READ_FILE_TOOL_NAME]: readFileTool,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: onlookInstructionsTool,
    [READ_STYLE_GUIDE_TOOL_NAME]: readStyleGuideTool,
    [LIST_BRANCHES_TOOL_NAME]: listBranchesTool,
    [SCRAPE_URL_TOOL_NAME]: scrapeUrlTool,
    [WEB_SEARCH_TOOL_NAME]: webSearchTool,
    [BASH_READ_TOOL_NAME]: bashReadTool,
    [GLOB_TOOL_NAME]: globTool,
    [GREP_TOOL_NAME]: grepTool,
};

export const BUILD_TOOL_SET: ToolSet = {
    ...ASK_TOOL_SET,
    [SEARCH_REPLACE_EDIT_FILE_TOOL_NAME]: searchReplaceEditFileTool,
    [SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME]: searchReplaceMultiEditFileTool,
    [FUZZY_EDIT_FILE_TOOL_NAME]: fuzzyEditFileTool,
    [WRITE_FILE_TOOL_NAME]: writeFileTool,
    [BASH_EDIT_TOOL_NAME]: bashEditTool,
    [SANDBOX_TOOL_NAME]: sandboxTool,
    [TERMINAL_COMMAND_TOOL_NAME]: terminalCommandTool,
    [TYPECHECK_TOOL_NAME]: typecheckTool,
};
