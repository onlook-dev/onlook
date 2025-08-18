import {
    FUZZY_EDIT_FILE_TOOL_NAME,
    type FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_EDIT_FILE_TOOL_NAME,
    type SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME,
    type SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_NAME, TODO_WRITE_TOOL_NAME,
    type TODO_WRITE_TOOL_PARAMETERS, WEB_SEARCH_TOOL_NAME,
    type WEB_SEARCH_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_NAME,
    type WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import type { WebSearchResult } from '@onlook/models';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import type { ToolInvocation } from 'ai';
import { type z } from 'zod';
import { BashCodeDisplay } from '../../code-display/bash-code-display';
import { CollapsibleCodeBlock } from '../../code-display/collapsible-code-block';
import { SearchSourcesDisplay } from '../../code-display/search-sources-display';
import { ToolCallSimple } from './tool-call-simple';

// Ensure ToolInvocation has a result property with proper typing
const ensureToolInvocationResult = (toolInvocation: ToolInvocation): ToolInvocation & { result: unknown } => {
    if (!('result' in toolInvocation)) {
        return {
            ...toolInvocation,
            result: null
        };
    }
    return toolInvocation as ToolInvocation & { result: unknown };
};

export const ToolCallDisplay = ({
    messageId,
    index,
    lastToolInvocationIdx,
    toolInvocationData,
    isStream,
    applied
}: {
    messageId: string,
    index: number,
    lastToolInvocationIdx: number,
    toolInvocationData: ToolInvocation,
    isStream: boolean,
    applied: boolean
}) => {
    // Ensure the toolInvocation has a result property
    const toolInvocation = ensureToolInvocationResult(toolInvocationData);

    if (!isStream || toolInvocation.state === 'result') {
        if (toolInvocation.toolName === TERMINAL_COMMAND_TOOL_NAME) {
            const args = toolInvocation.args as { command: string };
            const result = toolInvocation.result as { output?: string; error?: string } | null;
            if (!args?.command) {
                return (
                    <ToolCallSimple
                        toolInvocation={toolInvocation}
                        key={toolInvocation.toolCallId}
                        loading={false}
                    />
                );
            }
            return (
                <BashCodeDisplay
                    key={toolInvocation.toolCallId}
                    content={args.command}
                    isStream={isStream}
                    defaultStdOut={toolInvocation.state === 'result' ? result?.output ?? null : null}
                    defaultStdErr={toolInvocation.state === 'result' ? result?.error ?? null : null}
                />
            );
        }

        if (toolInvocation.toolName === WEB_SEARCH_TOOL_NAME && toolInvocation.state === 'result') {
            const searchResult: WebSearchResult | null = toolInvocation.result as WebSearchResult | null;
            const args = toolInvocation.args as z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>;
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

        if (toolInvocation.toolName === WRITE_FILE_TOOL_NAME) {
            const args = toolInvocation.args as z.infer<typeof WRITE_FILE_TOOL_PARAMETERS>
            const filePath = args?.file_path;
            const codeContent = args?.content;
            if (!filePath || !codeContent) {
                return (
                    <ToolCallSimple
                        toolInvocation={toolInvocation}
                        key={toolInvocation.toolCallId}
                        loading={false}
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
                    originalContent={codeContent}
                    updatedContent={codeContent}
                />
            );
        }

        if (toolInvocation.toolName === FUZZY_EDIT_FILE_TOOL_NAME) {
            const args = toolInvocation.args as z.infer<typeof FUZZY_EDIT_FILE_TOOL_PARAMETERS>;
            const filePath = args?.file_path;
            const codeContent = args?.content;
            if (!filePath || !codeContent) {
                return (
                    <ToolCallSimple
                        toolInvocation={toolInvocation}
                        key={toolInvocation.toolCallId}
                        loading={false}
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
                    originalContent={codeContent}
                    updatedContent={codeContent}
                />
            );
        }

        if (toolInvocation.toolName === SEARCH_REPLACE_EDIT_FILE_TOOL_NAME) {
            const args = toolInvocation.args as z.infer<typeof SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS>;
            const filePath = args?.file_path;
            const codeContent = args?.new_string;
            if (!filePath || !codeContent) {
                return (
                    <ToolCallSimple
                        toolInvocation={toolInvocation}
                        key={toolInvocation.toolCallId}
                        loading={false}
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
                    originalContent={codeContent}
                    updatedContent={codeContent}
                />
            );
        }

        if (toolInvocation.toolName === SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_NAME) {
            const args = toolInvocation.args as z.infer<typeof SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS>;
            const filePath = args?.file_path;
            const codeContent = args?.edits.map((edit) => edit.new_string).join('\n...\n');
            if (!filePath || !codeContent) {
                return (
                    <ToolCallSimple
                        toolInvocation={toolInvocation}
                        key={toolInvocation.toolCallId}
                        loading={false}
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
                    originalContent={codeContent}
                    updatedContent={codeContent}
                />
            );
        }

        if (toolInvocation.toolName === TODO_WRITE_TOOL_NAME) {
            const args = toolInvocation.args as z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>;
            const todos = args?.todos;
            if (!todos || todos.length === 0) {
                return (
                    <ToolCallSimple
                        toolInvocation={toolInvocation}
                        key={toolInvocation.toolCallId}
                        loading={false}
                    />
                );
            }
            return (
                <div>
                    {todos.map((todo) => (
                        <div className="flex items-center gap-2 text-sm" key={todo.content}>
                            <div className="flex items-center justify-center w-4 h-4 min-w-4">
                                {todo.status === 'completed' ? <Icons.SquareCheck className="w-4 h-4" /> : <Icons.Square className="w-4 h-4" />}
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
    }

    return (
        <ToolCallSimple
            toolInvocation={toolInvocation}
            key={toolInvocation.toolCallId}
            loading={isStream && index === lastToolInvocationIdx}
        />
    );
}
