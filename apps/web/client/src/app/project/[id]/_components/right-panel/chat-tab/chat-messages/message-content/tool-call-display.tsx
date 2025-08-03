import { CREATE_FILE_TOOL_NAME, EDIT_FILE_TOOL_NAME, TERMINAL_COMMAND_TOOL_NAME, type AskToolSet, type BuildToolSet } from '@onlook/ai';
import type { ToolUIPart } from 'ai';
import { BashCodeDisplay } from '../../code-display/bash-code-display';
import { CollapsibleCodeBlock } from '../../code-display/collapsible-code-block';
import { ToolCallSimple } from './tool-call-simple';

export const ToolCallDisplay = ({
    messageId,
    index,
    lastToolInvocationIdx,
    toolPart,
    isStream,
}: {
    messageId: string,
    index: number,
    lastToolInvocationIdx: number,
    toolPart: ToolUIPart<BuildToolSet | AskToolSet>,
    isStream: boolean,
}) => {
    const toolName = toolPart.type.split('-')[1];
    if (!isStream || toolPart.state === 'output-available') {
        if (toolName === TERMINAL_COMMAND_TOOL_NAME) {
            const input = toolPart.input as { command: string };
            const output = toolPart.output as string;
            const errorText = toolPart.errorText;
            return (
                <BashCodeDisplay
                    key={toolPart.toolCallId}
                    content={input.command}
                    isStream={isStream}
                    defaultStdOut={toolPart.state === 'output-available' ? output : null}
                    defaultStdErr={toolPart.state === 'output-error' ? errorText ?? null : null}
                />
            );
        }

        if (toolName === EDIT_FILE_TOOL_NAME || toolName === CREATE_FILE_TOOL_NAME) {
            const input = toolPart.input as { path: string; content: string };
            const filePath = input.path;
            const codeContent = input.content;
            return (
                <CollapsibleCodeBlock
                    path={filePath}
                    content={codeContent}
                    messageId={messageId}
                    applied={false}
                    isStream={isStream}
                    originalContent={codeContent}
                    updatedContent={codeContent}
                />
            );
        }
    }

    return (
        <ToolCallSimple
            toolPart={toolPart}
            key={toolPart.toolCallId}
            loading={isStream && index === lastToolInvocationIdx}
        />
    );
}
