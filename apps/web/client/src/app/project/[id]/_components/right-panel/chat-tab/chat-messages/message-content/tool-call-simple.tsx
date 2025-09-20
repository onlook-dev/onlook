import {
    BASH_EDIT_TOOL_NAME,
    type BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_NAME,
    type BASH_READ_TOOL_PARAMETERS,
    EXIT_PLAN_MODE_TOOL_NAME,
    FUZZY_EDIT_FILE_TOOL_NAME,
    type FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    GLOB_TOOL_NAME,
    GLOB_TOOL_PARAMETERS,
    GREP_TOOL_NAME,
    type GREP_TOOL_PARAMETERS,
    LIST_BRANCHES_TOOL_NAME,
    LIST_FILES_TOOL_NAME,
    type LIST_FILES_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILE_TOOL_NAME,
    type READ_FILE_TOOL_PARAMETERS,
    READ_STYLE_GUIDE_TOOL_NAME,
    SANDBOX_TOOL_NAME,
    SCRAPE_URL_TOOL_NAME,
    type SCRAPE_URL_TOOL_PARAMETERS,
    SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
    type SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME,
    type SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    type TODO_WRITE_TOOL_PARAMETERS,
    TYPECHECK_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    type WEB_SEARCH_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_NAME,
    type WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@onlook/ui/ai-elements';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { ToolUIPart } from 'ai';
import { type z } from 'zod';

// Map tool names to specific icon components
const TOOL_ICONS: Record<string, any> = {
    [LIST_FILES_TOOL_NAME]: Icons.ListBullet,
    [READ_FILE_TOOL_NAME]: Icons.EyeOpen,
    [READ_STYLE_GUIDE_TOOL_NAME]: Icons.Brand,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: Icons.OnlookLogo,
    [SEARCH_REPLACE_EDIT_FILE_TOOL_NAME]: Icons.Pencil,
    [SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME]: Icons.Pencil,
    [FUZZY_EDIT_FILE_TOOL_NAME]: Icons.Pencil,
    [WRITE_FILE_TOOL_NAME]: Icons.FilePlus,
    [TERMINAL_COMMAND_TOOL_NAME]: Icons.Terminal,
    [BASH_EDIT_TOOL_NAME]: Icons.Terminal,
    [GREP_TOOL_NAME]: Icons.MagnifyingGlass,
    [SCRAPE_URL_TOOL_NAME]: Icons.Globe,
    [WEB_SEARCH_TOOL_NAME]: Icons.MagnifyingGlass,
    [SANDBOX_TOOL_NAME]: Icons.Cube,
    [TODO_WRITE_TOOL_NAME]: Icons.ListBullet,
    [EXIT_PLAN_MODE_TOOL_NAME]: Icons.ListBullet,
    [BASH_READ_TOOL_NAME]: Icons.EyeOpen,
    [TYPECHECK_TOOL_NAME]: Icons.MagnifyingGlass,
    [LIST_BRANCHES_TOOL_NAME]: Icons.Branch,
    [GLOB_TOOL_NAME]: Icons.MagnifyingGlass,
} as const;

export function ToolCallSimple({
    toolPart,
    className,
    loading,
}: {
    toolPart: ToolUIPart;
    className?: string;
    loading?: boolean;
}) {
    const toolName = toolPart.type.split('-')[1] ?? '';
    const Icon = TOOL_ICONS[toolName] ?? Icons.QuestionMarkCircled;
    const title = getLabel(toolName, toolPart);
    return (
        <Tool>
            <ToolHeader title={title} type={toolPart.type} state={toolPart.state} icon={<Icon className="w-4 h-4 flex-shrink-0" />} />
            <ToolContent>
                <ToolInput input={toolPart.input} />
                <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
            </ToolContent>
        </Tool>
    )
}

function truncateString(str: string, maxLength: number = 30) {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

const getLabel = (toolName: string, toolPart: ToolUIPart) => {
    try {
        switch (toolName) {
            case TERMINAL_COMMAND_TOOL_NAME:
                return 'Terminal';
            case LIST_BRANCHES_TOOL_NAME:
                return 'Listing branches';
            case SEARCH_REPLACE_EDIT_FILE_TOOL_NAME:
                const params = toolPart.input as z.infer<typeof SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS>;
                if (params?.file_path) {
                    return 'Editing ' + (params.file_path.split('/').pop() || '');
                } else {
                    return 'Editing file';
                }
            case SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME:
                const params1 = toolPart.input as z.infer<typeof SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS>;
                if (params1?.edits) {
                    return 'Editing ' + (params1.file_path.split('/').pop() || '');
                } else {
                    return 'Editing files';
                }
            case FUZZY_EDIT_FILE_TOOL_NAME:
                const params2 = toolPart.input as z.infer<typeof FUZZY_EDIT_FILE_TOOL_PARAMETERS>;
                if (params2?.file_path) {
                    return 'Editing ' + (params2.file_path.split('/').pop() || '');
                } else {
                    return 'Editing file';
                }
            case WRITE_FILE_TOOL_NAME:
                const params3 = toolPart.input as z.infer<typeof WRITE_FILE_TOOL_PARAMETERS>;
                if (params3?.file_path) {
                    return 'Writing file ' + (params3.file_path.split('/').pop() || '');
                } else {
                    return 'Writing file';
                }
            case LIST_FILES_TOOL_NAME:
                const params4 = toolPart.input as z.infer<typeof LIST_FILES_TOOL_PARAMETERS>;
                if (params4?.path) {
                    return 'Reading directory ' + (params4.path.split('/').pop() || '');
                } else {
                    return 'Reading directory';
                }
            case READ_FILE_TOOL_NAME:
                const params5 = toolPart.input as z.infer<typeof READ_FILE_TOOL_PARAMETERS>;
                if (params5?.file_path) {
                    return 'Reading file ' + (params5.file_path.split('/').pop() || '');
                } else {
                    return 'Reading files';
                }
            case SCRAPE_URL_TOOL_NAME:
                const params6 = toolPart.input as z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>;
                if (params6?.url) {
                    return 'Visiting ' + (new URL(params6.url).hostname || 'URL');
                } else {
                    return 'Visiting URL';
                }
            case WEB_SEARCH_TOOL_NAME:
                if (toolPart.input && typeof toolPart.input === 'object' && 'query' in toolPart.input) {
                    const params10 = toolPart.input as z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>;
                    const query = params10.query;
                    return "Searching \"" + truncateString(query) + "\"";
                } else {
                    return 'Searching web';
                }
            case SANDBOX_TOOL_NAME:
                if (toolPart.input && typeof toolPart.input === 'object' && 'command' in toolPart.input) {
                    return 'Sandbox: ' + toolPart.input?.command;
                } else {
                    return 'Sandbox';
                }
            case GREP_TOOL_NAME:
                if (toolPart.input && typeof toolPart.input === 'object' && 'pattern' in toolPart.input) {
                    const params11 = toolPart.input as z.infer<typeof GREP_TOOL_PARAMETERS>;
                    const pattern = params11.pattern;
                    return 'Searching for ' + truncateString(pattern);
                } else {
                    return 'Searching';
                }
            case BASH_EDIT_TOOL_NAME:
                const params7 = toolPart.input as z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>;
                if (params7?.command) {
                    return 'Running command ' + (params7.command.split('/').pop() || '');
                } else {
                    return 'Running command';
                }
            case BASH_READ_TOOL_NAME:
                const params8 = toolPart.input as z.infer<typeof BASH_READ_TOOL_PARAMETERS>;
                if (params8?.command) {
                    return 'Reading file ' + (params8.command.split('/').pop() || '');
                } else {
                    return 'Reading file';
                }
            case TODO_WRITE_TOOL_NAME:
                const params9 = toolPart.input as z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>;
                if (params9?.todos) {
                    return 'Writing todos ' + (params9?.todos.map((todo: { content: string; status: string; priority: string; }) => todo.content).join(', ') || '');
                } else {
                    return 'Writing todos';
                }
            case GLOB_TOOL_NAME:
                const params12 = toolPart.input as z.infer<typeof GLOB_TOOL_PARAMETERS>;
                if (params12?.pattern) {
                    return 'Searching for ' + truncateString(params12.pattern);
                } else {
                    return 'Searching';
                }
            case EXIT_PLAN_MODE_TOOL_NAME:
                return 'Exiting plan mode';
            case READ_STYLE_GUIDE_TOOL_NAME:
                return 'Reading style guide';
            case ONLOOK_INSTRUCTIONS_TOOL_NAME:
                return 'Reading Onlook instructions';
            case TYPECHECK_TOOL_NAME:
                return 'Checking types';
            default:
                return toolName?.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
    } catch (error) {
        console.error('Error getting label', error);
        return toolName?.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}