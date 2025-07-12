import React from 'react';
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


const formatToolName = (name: string) =>
    name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const getFilename = (path?: string) => path?.split('/').pop() || '';

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

const LABEL_GENERATORS: Record<string, (args: ToolInvocation['args']) => string> = {
    [TERMINAL_COMMAND_TOOL_NAME]: () => "Terminal",
    [EDIT_FILE_TOOL_NAME]: (args) => `Editing ${getFilename(args?.path as string)}` || "Editing file",
    [CREATE_FILE_TOOL_NAME]: (args) => `Creating file ${getFilename(args?.path as string)}` || "Creating file",
    [LIST_FILES_TOOL_NAME]: (args) => `Reading directory ${getFilename(args?.path as string)}` || "Reading directory",
    [READ_FILES_TOOL_NAME]: (args) => {
        const paths = args?.paths as string[] || [];
        const fileNames = paths.map(getFilename).join(', ');
        return `Reading file${paths.length > 1 ? 's' : ''} ${fileNames}` || "Reading files";
    },
    [READ_STYLE_GUIDE_TOOL_NAME]: () => "Reading style guide",
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: () => "Reading Onlook instructions",
    [SCRAPE_URL_TOOL_NAME]: (args) => {
        try {
            const url = new URL(args?.url as string);
            return `Visiting ${url.hostname}`;
        } catch {
            return "Visiting URL";
        }
    },
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
    const { toolName, args } = toolInvocation;
    const Icon = TOOL_ICONS[toolName] ?? Icons.QuestionMarkCircled;

    // useMemo prevents recalculating the label on every render if the toolInvocation hasn't changed.
    const label = React.useMemo(() => {
        try {
            const generator = LABEL_GENERATORS[toolName];
            if (generator) {
                return generator(args);
            }
            // Fallback for unregistered tools.
            return formatToolName(toolName);
        } catch (error) {
            console.error('Error getting label for tool:', toolName, error);
            // Fallback in case a generator function fails.
            return formatToolName(toolName);
        }
    }, [toolName, args]);

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
                {label}
            </span>
        </div>
    );
}