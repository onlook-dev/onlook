import {
    CREATE_FILE_TOOL_NAME,
    EDIT_FILE_TOOL_NAME,
    LIST_FILES_TOOL_NAME,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_STYLE_GUIDE_TOOL_NAME,
    SCRAPE_URL_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_NAME
} from '@onlook/ai';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { ToolInvocation } from 'ai';

// Map tool names to specific icon components
const TOOL_ICONS: Record<string, any> = {
    [LIST_FILES_TOOL_NAME]: Icons.ListBullet,
    [READ_FILES_TOOL_NAME]: Icons.EyeOpen,
    [READ_STYLE_GUIDE_TOOL_NAME]: Icons.Brand,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: Icons.OnlookLogo,
    [EDIT_FILE_TOOL_NAME]: Icons.Pencil,
    [CREATE_FILE_TOOL_NAME]: Icons.FilePlus,
    [TERMINAL_COMMAND_TOOL_NAME]: Icons.Terminal,
    [SCRAPE_URL_TOOL_NAME]: Icons.Globe,
};

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
            let label = '';
            if (toolName === TERMINAL_COMMAND_TOOL_NAME) {
                return 'Terminal';
            }
            if (toolName === EDIT_FILE_TOOL_NAME) {
                if (toolInvocation.args && 'path' in toolInvocation.args) {
                    label = "Editing " + (toolInvocation.args.path.split('/').pop() || '');
                } else {
                    label = "Editing file";
                }
            } else if (toolName === CREATE_FILE_TOOL_NAME) {
                if (toolInvocation.args && 'path' in toolInvocation.args) {
                    label = "Creating file " + (toolInvocation.args.path.split('/').pop() || '');
                } else {
                    label = "Creating file";
                }
            } else if (toolName === LIST_FILES_TOOL_NAME) {
                if (toolInvocation.args && 'path' in toolInvocation.args) {
                    label = "Reading directory " + (toolInvocation.args.path.split('/').pop() || '');
                } else {
                    label = "Reading directory";
                }
            } else if (toolName === READ_FILES_TOOL_NAME) {
                if (toolInvocation.args && 'paths' in toolInvocation.args) {
                    label = "Reading file" + (toolInvocation.args.paths.length > 1 ? 's' : '') + ' ' + (toolInvocation.args.paths.map((path: string) => path.split('/').pop()).join(', ') || '');
                } else {
                    label = "Reading files";
                }
            } else if (toolName === READ_STYLE_GUIDE_TOOL_NAME) {
                label = "Reading style guide";
            } else if (toolName === ONLOOK_INSTRUCTIONS_TOOL_NAME) {
                label = "Reading Onlook instructions";
            } else if (toolName === SCRAPE_URL_TOOL_NAME) {
                if (toolInvocation.args && 'url' in toolInvocation.args) {
                    try {
                        const url = new URL(toolInvocation.args.url as string);
                        label = "Visiting " + url.hostname;
                    } catch {
                        label = "Visiting URL";
                    }
                } else {
                    label = "Visiting URL";
                }
            } else {
                label = toolName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            return label;
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