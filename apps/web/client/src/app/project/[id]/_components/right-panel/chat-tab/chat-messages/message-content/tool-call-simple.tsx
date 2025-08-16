import {
    BASH_EDIT_TOOL_NAME,
    type BASH_EDIT_TOOL_PARAMETERS,
    BASH_READ_TOOL_NAME,
    type BASH_READ_TOOL_PARAMETERS,
    EXIT_PLAN_MODE_TOOL_NAME,
    FUZZY_EDIT_FILE_TOOL_NAME,
    type FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    GREP_TOOL_NAME,
    type GREP_TOOL_PARAMETERS,
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
    WEB_SEARCH_TOOL_NAME,
    type WEB_SEARCH_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_NAME,
    type WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { ToolInvocation } from 'ai';
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
} as const;

export function ToolCallSimple({
    toolInvocation,
    className,
    loading,
}: {
    toolInvocation: ToolInvocation;
    className?: string;
    loading?: boolean;
}) {
    const toolName = toolInvocation.toolName;
    const Icon = TOOL_ICONS[toolName] ?? Icons.QuestionMarkCircled;

    const getLabel = () => {
        try {
            switch (toolName) {
                case TERMINAL_COMMAND_TOOL_NAME:
                    return 'Terminal';
                case SEARCH_REPLACE_EDIT_FILE_TOOL_NAME:
                    const params = toolInvocation.args as z.infer<typeof SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS>;
                    if (params?.file_path) {
                        return 'Editing ' + (params.file_path.split('/').pop() || '');
                    } else {
                        return 'Editing file';
                    }
                case SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME:
                    const params1 = toolInvocation.args as z.infer<typeof SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS>;
                    if (params1?.edits) {
                        return 'Editing ' + (params1.edits.map((edit: { old_string: string; new_string: string; replace_all: boolean; }) => edit.old_string).join(', ') || '');
                    } else {
                        return 'Editing files';
                    }
                case FUZZY_EDIT_FILE_TOOL_NAME:
                    const params2 = toolInvocation.args as z.infer<typeof FUZZY_EDIT_FILE_TOOL_PARAMETERS>;
                    if (params2?.file_path) {
                        return 'Editing ' + (params2.file_path.split('/').pop() || '');
                    } else {
                        return 'Editing file';
                    }
                case WRITE_FILE_TOOL_NAME:
                    const params3 = toolInvocation.args as z.infer<typeof WRITE_FILE_TOOL_PARAMETERS>;
                    if (params3?.file_path) {
                        return 'Writing file ' + (params3.file_path.split('/').pop() || '');
                    } else {
                        return 'Writing file';
                    }
                case LIST_FILES_TOOL_NAME:
                    const params4 = toolInvocation.args as z.infer<typeof LIST_FILES_TOOL_PARAMETERS>;
                    if (params4?.path) {
                        return 'Reading directory ' + (params4.path.split('/').pop() || '');
                    } else {
                        return 'Reading directory';
                    }
                case READ_FILE_TOOL_NAME:
                    const params5 = toolInvocation.args as z.infer<typeof READ_FILE_TOOL_PARAMETERS>;
                    if (params5?.file_path) {
                        return 'Reading file ' + (params5.file_path.split('/').pop() || '');
                    } else {
                        return 'Reading files';
                    }
                case SCRAPE_URL_TOOL_NAME:
                    const params6 = toolInvocation.args as z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>;
                    if (params6?.url) {
                        return 'Visiting ' + (new URL(params6.url).hostname || 'URL');
                    } else {
                        return 'Visiting URL';
                    }
                case WEB_SEARCH_TOOL_NAME:
                    if (toolInvocation.args && 'query' in toolInvocation.args) {
                        const params10 = toolInvocation.args as z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>;
                        const query = params10.query;
                        return "Searching \"" + (query.length > 30 ? query.substring(0, 30) + "..." : query) + "\"";
                    } else {
                        return 'Searching web';
                    }
                case SANDBOX_TOOL_NAME:
                    if (toolInvocation.args && 'command' in toolInvocation.args) {
                        return 'Sandbox: ' + toolInvocation.args?.command;
                    } else {
                        return 'Sandbox';
                    }
                case GREP_TOOL_NAME:
                    if (toolInvocation.args && 'pattern' in toolInvocation.args) {
                        const params11 = toolInvocation.args as z.infer<typeof GREP_TOOL_PARAMETERS>;
                        const pattern = params11.pattern;
                        return 'Searching for ' + pattern;
                    } else {
                        return 'Searching';
                    }
                case BASH_EDIT_TOOL_NAME:
                    const params7 = toolInvocation.args as z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>;
                    if (params7?.command) {
                        return 'Running command ' + (params7.command.split('/').pop() || '');
                    } else {
                        return 'Running command';
                    }
                case BASH_READ_TOOL_NAME:
                    const params8 = toolInvocation.args as z.infer<typeof BASH_READ_TOOL_PARAMETERS>;
                    if (params8?.command) {
                        return 'Reading file ' + (params8.command.split('/').pop() || '');
                    } else {
                        return 'Reading file';
                    }
                case TODO_WRITE_TOOL_NAME:
                    const params9 = toolInvocation.args as z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>;
                    if (params9?.todos) {
                        return 'Writing todos ' + (params9?.todos.map((todo: { content: string; status: string; priority: string; }) => todo.content).join(', ') || '');
                    } else {
                        return 'Writing todos';
                    }
                case EXIT_PLAN_MODE_TOOL_NAME:
                    return 'Exiting plan mode';
                case READ_STYLE_GUIDE_TOOL_NAME:
                    return 'Reading style guide';
                case ONLOOK_INSTRUCTIONS_TOOL_NAME:
                    return 'Reading Onlook instructions';
                default:
                    return toolName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
        } catch (error) {
            console.error('Error getting label', error);
            return toolName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
    }
    return (
        <div className={cn('flex items-center gap-2 ml-2 text-foreground-tertiary/80', className)}>
            <Icon className="w-4 h-4" />
            <span
                className={cn(
                    'text-regularPlus',
                    loading &&
                    'bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                )}
            >
                {getLabel()}
            </span>
        </div>
    );
} 