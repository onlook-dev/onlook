import {
    type ChatMessageContext,
    type FileMessageContext,
    type HighlightedMessageContext,
} from '@onlook/models/chat';
import type { TemplateNode } from '@onlook/models/element';

export function getStrippedContext(context: ChatMessageContext[]): ChatMessageContext[] {
    return context.map((c) => {
        if (c.value) {
            c.value = '// Removed to save space';
        }
        return c;
    });
}

export function getFormattedUserPrompt(
    content: string,
    context: ChatMessageContext[] = [],
): string {
    const files = context.filter((c) => c.type === 'file') as FileMessageContext[];
    const selections = context.filter((c) => c.type === 'selected') as HighlightedMessageContext[];

    let message = '';

    if (files.length === 0 && selections.length === 0) {
        return content;
    }

    if (files.length > 0) {
        message += getFileString(files);
    }

    if (selections.length > 0) {
        message += getSelectionString(selections);
    }

    message += getUserInstructionString(content);
    return message;
}

function getFileString(files: FileMessageContext[]) {
    const formattedFiles = files
        .map(
            (file) => `<file-name>${file.name}</file-name>
<file-code>
${file.value}
</file-code>`,
        )
        .join('\n');

    const fileString = `<instruction>I am currently selecting these files:</instruction>
${formattedFiles}\n`;
    return fileString;
}

function getSelectionString(selections: HighlightedMessageContext[]) {
    const formatedSelection = selections
        .map(
            (selection) => `${getTemplateNodeString(selection.templateNode)}
<selection-code>
${selection.value}
<selection-code>`,
        )
        .join('\n');

    const selectionString = `<instruction>I am currently selecting this code:</instruction>
${formatedSelection}
`;
    return selectionString;
}

function getTemplateNodeString(templateNode: TemplateNode) {
    const start = templateNode.startTag.start;
    const end = templateNode.endTag?.end || templateNode.startTag.end;
    return `<selection-info>
<file-name>${templateNode.path}</file-name>
<start>line: ${start.line} column: ${start.column}</start>
<end>line: ${end.line} column:${end.column}</end>
</selection-info>`;
}

function getUserInstructionString(instructions: string) {
    return `<instruction>
Please edit the selected code or the entire file following these instructions: \t${instructions}
If you make a change, rewrite the entire file.
</instruction>`;
}
