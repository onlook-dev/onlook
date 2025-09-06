import { type ToolSet } from 'ai';
import {
    BASH_EDIT_TOOL_NAME,
    BASH_READ_TOOL_NAME,
    bashEditTool,
    bashReadTool,
    GLOB_TOOL_NAME,
    globTool,
    GREP_TOOL_NAME,
    grepTool,
    TERMINAL_COMMAND_TOOL_NAME,
    terminalCommandTool,
    TYPECHECK_TOOL_NAME,
    typecheckTool,
} from './cli';
import {
    FUZZY_EDIT_FILE_TOOL_NAME,
    fuzzyEditFileTool,
    SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME,
    searchReplaceEditFileTool,
    searchReplaceMultiEditFileTool,
    WRITE_FILE_TOOL_NAME,
    writeFileTool,
} from './edit';
import {
    LIST_BRANCHES_TOOL_NAME,
    listBranchesTool,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    onlookInstructionsTool,
    READ_STYLE_GUIDE_TOOL_NAME,
    readStyleGuideTool,
} from './guides';
import { LIST_FILES_TOOL_NAME, listFilesTool, READ_FILE_TOOL_NAME, readFileTool } from './read';
import { SANDBOX_TOOL_NAME, sandboxTool } from './sandbox';
import { SCRAPE_URL_TOOL_NAME, scrapeUrlTool, WEB_SEARCH_TOOL_NAME, webSearchTool } from './web';

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
