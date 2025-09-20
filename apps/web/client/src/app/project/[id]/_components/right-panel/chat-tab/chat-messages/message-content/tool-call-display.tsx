import {
    FUZZY_EDIT_FILE_TOOL_NAME,
    type FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
    type SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME,
    type SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_NAME, TERMINAL_COMMAND_TOOL_PARAMETERS, TODO_WRITE_TOOL_NAME,
    type TODO_WRITE_TOOL_PARAMETERS, TYPECHECK_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    type WEB_SEARCH_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_NAME,
    type WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import type { WebSearchResult } from '@onlook/models';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import type { ToolUIPart } from 'ai';
import stripAnsi from 'strip-ansi';
import { type z } from 'zod';
import { BashCodeDisplay } from '../../code-display/bash-code-display';
import { CollapsibleCodeBlock } from '../../code-display/collapsible-code-block';
import { SearchSourcesDisplay } from '../../code-display/search-sources-display';
import { ToolCallSimple } from './tool-call-simple';

export const ToolCallDisplay = ({
    messageId,
    isLastPart,
    toolPart,
    isStream,
    applied
}: {
    messageId: string,
    isLastPart: boolean,
    toolPart: ToolUIPart,
    isStream: boolean,
    applied: boolean
}) => {
    const toolName = toolPart.type.split('-')[1];
    const loading = isStream && isLastPart;

    if (isStream || (toolPart.state !== 'output-available' && toolPart.state !== 'input-available')) {
        return (
            <ToolCallSimple
                toolPart={toolPart}
                key={toolPart.toolCallId}
                loading={loading}
            />
        );
    }

    if (toolName === TERMINAL_COMMAND_TOOL_NAME) {
        const args = toolPart.input as z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS> | null;
        const result = toolPart.output as { output?: string; error?: string } | null;
        if (!args?.command) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
                    loading={loading}
                />
            );
        }
        return (
            <BashCodeDisplay
                key={toolPart.toolCallId}
                content={args.command}
                isStream={isStream}
                defaultStdOut={toolPart.state === 'output-available' ? result?.output ?? null : null}
                defaultStdErr={toolPart.state === 'output-available' ? result?.error ?? null : null}
            />
        );
    }

    if (toolName === WEB_SEARCH_TOOL_NAME && toolPart.state === 'output-available') {
        const searchResult: WebSearchResult | null = toolPart.output as WebSearchResult | null;
        const args = toolPart.input as z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>;
        if (args?.query && searchResult?.result && searchResult.result.length > 0) {
            return (
                <SearchSourcesDisplay
                    query={String(args.query)}
                    results={Array.isArray(searchResult.result) ? (searchResult.result as unknown[]).map((result: unknown) => ({
                        title: String((result as { title?: string; url?: string }).title ?? (result as { url?: string }).url ?? ''),
                        url: String((result as { url?: string }).url ?? '')
                    })) : []}
                />
            );
        }
    }

    if (toolName === WRITE_FILE_TOOL_NAME) {
        const args = toolPart.input as z.infer<typeof WRITE_FILE_TOOL_PARAMETERS> | null;
        const filePath = args?.file_path;
        const codeContent = args?.content;
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
                    loading={loading}
                />
            );
        }
        return (
            <CollapsibleCodeBlock
                path={filePath}
                content={codeContent}
                messageId={messageId}
                applied={applied}
                isStream={isStream}
                branchId={branchId}
            />
        );
    }

    if (toolName === FUZZY_EDIT_FILE_TOOL_NAME) {
        const args = toolPart.input as z.infer<typeof FUZZY_EDIT_FILE_TOOL_PARAMETERS> | null;
        const filePath = args?.file_path;
        const codeContent = args?.content;
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
                    loading={loading}
                />
            );
        }
        return (
            <CollapsibleCodeBlock
                path={filePath}
                content={codeContent}
                messageId={messageId}
                applied={applied}
                isStream={isStream}
                branchId={branchId}
            />
        );
    }

    if (toolName === SEARCH_REPLACE_EDIT_FILE_TOOL_NAME) {
        const args = toolPart.input as z.infer<typeof SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS> | null;
        const filePath = args?.file_path;
        const codeContent = args?.new_string;
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
                    loading={loading}
                />
            );
        }
        return (
            <CollapsibleCodeBlock
                path={filePath}
                content={codeContent}
                messageId={messageId}
                applied={applied}
                isStream={isStream}
                branchId={branchId}
            />
        );
    }

    if (toolName === SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME) {
        const args = toolPart.input as z.infer<typeof SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS> | null;
        const filePath = args?.file_path;
        const codeContent = args?.edits?.map((edit) => edit.new_string).join('\n...\n');
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
                    loading={loading}
                />
            );
        }
        return (
            <CollapsibleCodeBlock
                path={filePath}
                content={codeContent}
                messageId={messageId}
                applied={applied}
                isStream={isStream}
                branchId={branchId}
            />
        );
    }

    if (toolName === TODO_WRITE_TOOL_NAME) {
        const args = toolPart.input as z.infer<typeof TODO_WRITE_TOOL_PARAMETERS> | null;
        const todos = args?.todos;
        if (!todos || todos.length === 0) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
                    loading={loading}
                />
            );
        }
        return (
            <div>
                {todos.map((todo) => (
                    <div className="flex items-center gap-2 text-sm" key={todo.content}>
                        <div className="flex items-center justify-center w-4 h-4 min-w-4">
                            {
                                todo.status === 'completed' ?
                                    <Icons.SquareCheck className="w-4 h-4" /> :
                                    <Icons.Square className="w-4 h-4" />
                            }
                        </div>
                        <p className={cn(
                            todo.status === 'completed' ? 'line-through text-green-500' : '',
                            todo.status === 'in_progress' ? 'text-yellow-500' : '',
                            todo.status === 'pending' ? 'text-gray-500' : '',
                        )}>{todo.content}</p>
                    </div>
                ))}
            </div>
        );
    }

    if (toolName === TYPECHECK_TOOL_NAME) {
        const result = toolPart.output as { success: boolean; error?: string } | null;
        const error = stripAnsi(result?.error || '');
        return (
            <BashCodeDisplay
                key={toolPart.toolCallId}
                content={'bunx tsc --noEmit'}
                isStream={isStream}
                defaultStdOut={(result?.success ? '✅ Typecheck passed!' : result?.error) ?? null}
                defaultStdErr={error ?? null}
            />
        );
    }

    return (
        <ToolCallSimple
            toolPart={toolPart}
            key={toolPart.toolCallId}
            loading={loading}
        />
    );
}
