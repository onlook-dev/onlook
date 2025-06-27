import { CREATE_FILE_TOOL_NAME, EDIT_FILE_TOOL_NAME, TERMINAL_COMMAND_TOOL_NAME } from '@onlook/ai';
import type { ToolInvocation } from 'ai';
import { BashCodeDisplay } from '../../code-display/bash-code-display';
import { CollapsibleCodeBlock } from '../../code-display/collapsible-code-block';
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
