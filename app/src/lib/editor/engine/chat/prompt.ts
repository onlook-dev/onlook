import {
    ChatMessageContext,
    FileMessageContext,
    HighlightedMessageContext,
} from '/common/models/chat';
import { TemplateNode } from '/common/models/element/templateNode';

export function getFormattedPrompt(content: string, context: ChatMessageContext[] = []): string {
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
            (file) =>
                `
${file.name}
\`\`\`
${file.value}
\`\`\``,
        )
        .join('\n');

    const fileString = `
I am currently selecting these files:
${formattedFiles}
`;
    return fileString;
}

function getSelectionString(selections: HighlightedMessageContext[]) {
    const formatedSelection = selections
        .map(
            (selection) =>
                `
${getTemplateNodeString(selection.templateNode)}
\`\`\`
${selection.value}
\`\`\``,
        )
        .join('\n');

    const selectionString = `
I am currently selecting this code:
${formatedSelection}
`;
    return selectionString;
}

function getTemplateNodeString(templateNode: TemplateNode) {
    const start = templateNode.startTag.start;
    const end = templateNode.endTag?.end || templateNode.startTag.end;
    return `${templateNode.path}#L${start.line}C${start.column}-L${end.line}C${end.column}`;
}

function getUserInstructionString(instructions: string) {
    return `
Please edit the selected code or the entire file following these instructions: \t${instructions}
If you make a change, rewrite the entire file.
`;
}
