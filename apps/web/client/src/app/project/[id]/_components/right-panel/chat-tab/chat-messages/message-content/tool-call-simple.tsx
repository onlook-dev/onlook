import {
    CREATE_FILE_TOOL_NAME,
    EDIT_FILE_TOOL_NAME,
    LIST_FILES_TOOL_NAME,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_STYLE_GUIDE_TOOL_NAME,
    SANDBOX_TOOL_NAME,
    SCRAPE_URL_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_NAME,
    type AskToolSet,
    type BuildToolSet
} from '@onlook/ai';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { ToolUIPart } from 'ai';

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
    [SANDBOX_TOOL_NAME]: Icons.Cube,
};

export function ToolCallSimple({
    toolPart,
    className,
    loading,
}: {
    toolPart: ToolUIPart<BuildToolSet | AskToolSet>;
    className?: string;
    loading?: boolean;
}) {
    const toolName = toolPart.type.split('-')[1];
    const Icon = TOOL_ICONS[toolName] ?? Icons.QuestionMarkCircled;

    const getLabel = () => {
        try {
            let label = '';
            if (toolName === TERMINAL_COMMAND_TOOL_NAME) {
                return 'Terminal';
            }
            if (toolName === EDIT_FILE_TOOL_NAME) {
                if (toolPart.input && 'path' in toolPart.input) {
                    label = "Editing " + (toolPart.input.path.split('/').pop() || '');
                } else {
                    label = "Editing file";
                }
            } else if (toolName === CREATE_FILE_TOOL_NAME) {
                if (toolPart.input && 'path' in toolPart.input) {
                    label = "Creating file " + (toolPart.input.path.split('/').pop() || '');
                } else {
                    label = "Creating file";
                }
            } else if (toolName === LIST_FILES_TOOL_NAME) {
                if (toolPart.input && 'path' in toolPart.input) {
                    label = "Reading directory " + (toolPart.input.path.split('/').pop() || '');
                } else {
                    label = "Reading directory";
                }
            } else if (toolName === READ_FILES_TOOL_NAME) {
                if (toolPart.input && 'paths' in toolPart.input) {
                    label = "Reading file" + (toolPart.input.paths.length > 1 ? 's' : '') + ' ' + (toolPart.input.paths.map((path: string) => path.split('/').pop()).join(', ') || '');
                } else {
                    label = "Reading files";
                }
            } else if (toolName === READ_STYLE_GUIDE_TOOL_NAME) {
                label = "Reading style guide";
            } else if (toolName === ONLOOK_INSTRUCTIONS_TOOL_NAME) {
                label = "Reading Onlook instructions";
            } else if (toolName === SCRAPE_URL_TOOL_NAME) {
                if (toolPart.input && 'url' in toolPart.input) {
                    try {
                        const url = new URL(toolPart.input.url as string);
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