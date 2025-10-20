import { FuzzyEditFileTool, SearchReplaceEditTool, SearchReplaceMultiEditFileTool, TerminalCommandTool, TypecheckTool, WebSearchTool, WriteFileTool } from '@onlook/ai';
import type { WebSearchResult } from '@onlook/models';
import type { ToolUIPart } from 'ai';
import { observer } from 'mobx-react-lite';
import stripAnsi from 'strip-ansi';
import { type z } from 'zod';
import { BashCodeDisplay } from '../../code-display/bash-code-display';
import { CollapsibleCodeBlock } from '../../code-display/collapsible-code-block';
import { SearchSourcesDisplay } from '../../code-display/search-sources-display';
import { ToolCallSimple } from './tool-call-simple';

const ToolCallDisplayComponent = ({
    messageId,
    toolPart,
    isStream,
    applied
}: {
    messageId: string,
    toolPart: ToolUIPart,
    isStream: boolean,
    applied: boolean
}) => {
    const toolName = toolPart.type.split('-')[1];

    if (isStream || (toolPart.state !== 'output-available' && toolPart.state !== 'input-available')) {
        return (
            <ToolCallSimple
                toolPart={toolPart}
                key={toolPart.toolCallId}
                loading={true}
            />
        );
    }

    if (toolName === TerminalCommandTool.toolName) {
        const args = toolPart.input as z.infer<typeof TerminalCommandTool.parameters> | null;
        const result = toolPart.output as { output?: string; error?: string } | null;
        if (!args?.command) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
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

    if (toolName === WebSearchTool.toolName && toolPart.state === 'output-available') {
        const searchResult: WebSearchResult | null = toolPart.output as WebSearchResult | null;
        const args = toolPart.input as z.infer<typeof WebSearchTool.parameters>;
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

    if (toolName === WriteFileTool.toolName) {
        const args = toolPart.input as z.infer<typeof WriteFileTool.parameters> | null;
        const filePath = args?.file_path;
        const codeContent = args?.content;
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
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

    if (toolName === FuzzyEditFileTool.toolName) {
        const args = toolPart.input as z.infer<typeof FuzzyEditFileTool.parameters> | null;
        const filePath = args?.file_path;
        const codeContent = args?.content;
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
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

    if (toolName === SearchReplaceEditTool.toolName) {
        const args = toolPart.input as z.infer<typeof SearchReplaceEditTool.parameters> | null;
        const filePath = args?.file_path;
        const codeContent = args?.new_string;
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
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

    if (toolName === SearchReplaceMultiEditFileTool.toolName) {
        const args = toolPart.input as z.infer<typeof SearchReplaceMultiEditFileTool.parameters> | null;
        const filePath = args?.file_path;
        const codeContent = args?.edits?.map((edit) => edit.new_string).join('\n...\n');
        const branchId = args?.branchId;
        if (!filePath || !codeContent) {
            return (
                <ToolCallSimple
                    toolPart={toolPart}
                    key={toolPart.toolCallId}
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

    // if (toolName === TodoWriteTool.toolName) {
    //     const args = toolPart.input as z.infer<typeof TodoWriteTool.parameters> | null;
    //     const todos = args?.todos;
    //     if (!todos || todos.length === 0) {
    //         return (
    //             <ToolCallSimple
    //                 toolPart={toolPart}
    //                 key={toolPart.toolCallId}
    //                 loading={loading}
    //             />
    //         );
    //     }
    //     return (
    //         <div>
    //             {todos.map((todo) => (
    //                 <div className="flex items-center gap-2 text-sm" key={todo.content}>
    //                     <div className="flex items-center justify-center w-4 h-4 min-w-4">
    //                         {
    //                             todo.status === 'completed' ?
    //                                 <Icons.SquareCheck className="w-4 h-4" /> :
    //                                 <Icons.Square className="w-4 h-4" />
    //                         }
    //                     </div>
    //                     <p className={cn(
    //                         todo.status === 'completed' ? 'line-through text-green-500' : '',
    //                         todo.status === 'in_progress' ? 'text-yellow-500' : '',
    //                         todo.status === 'pending' ? 'text-gray-500' : '',
    //                     )}>{todo.content}</p>
    //                 </div>
    //             ))}
    //         </div>
    //     );
    // }

    if (toolName === TypecheckTool.toolName) {
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
        />
    );
};

export const ToolCallDisplay = observer(ToolCallDisplayComponent);
