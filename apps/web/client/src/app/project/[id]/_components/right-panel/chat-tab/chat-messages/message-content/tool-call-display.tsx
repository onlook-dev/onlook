import { CREATE_FILE_TOOL_NAME, EDIT_FILE_TOOL_NAME, SEARCH_WEB_TOOL_NAME, TERMINAL_COMMAND_TOOL_NAME } from '@onlook/ai';
import type { ToolInvocation } from 'ai';
import { BashCodeDisplay } from '../../code-display/bash-code-display';
import { CollapsibleCodeBlock } from '../../code-display/collapsible-code-block';
import { SearchSourcesDisplay } from '../../code-display/search-sources-display';
import { ToolCallSimple } from './tool-call-simple';

export const ToolCallDisplay = ({
    messageId,
    index,
    lastToolInvocationIdx,
    toolInvocation,
    isStream,
    applied
}: {
    messageId: string,
    index: number,
    lastToolInvocationIdx: number,
    toolInvocation: ToolInvocation,
    isStream: boolean,
    applied: boolean
}) => {

    if (!isStream || toolInvocation.state === 'result') {
        if (toolInvocation.toolName === TERMINAL_COMMAND_TOOL_NAME) {
            return (
                <BashCodeDisplay
                    key={toolInvocation.toolCallId}
                    content={toolInvocation.args.command}
                    isStream={isStream}
                    defaultStdOut={toolInvocation.state === 'result' ? toolInvocation.result.output : null}
                    defaultStdErr={toolInvocation.state === 'result' ? toolInvocation.result.error : null}
                />
            );
        }

        if (toolInvocation.toolName === SEARCH_WEB_TOOL_NAME && toolInvocation.state === 'result') {
            try {
                const searchResult = JSON.parse(toolInvocation.result as string);
                if (searchResult?.query && searchResult?.results) {
                    return (
                        <SearchSourcesDisplay
                            query={String(searchResult.query)}
                            searchType={String(searchResult.searchType || 'auto')}
                            results={Array.isArray(searchResult.results) ? searchResult.results : []}
                            totalResults={Number(searchResult.totalResults) || 0}
                            searchTime={String(searchResult.searchTime || '0ms')}
                        />
                    );
                }
            } catch (error) {
                console.error('Failed to parse search result:', error);
            }
        }

        if (toolInvocation.toolName === EDIT_FILE_TOOL_NAME || toolInvocation.toolName === CREATE_FILE_TOOL_NAME) {
            const filePath = toolInvocation.args.path;
            const codeContent = toolInvocation.args.content;
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
    }

    return (
        <ToolCallSimple
            toolInvocation={toolInvocation}
            key={toolInvocation.toolCallId}
            loading={isStream && index === lastToolInvocationIdx}
        />
    );
}
