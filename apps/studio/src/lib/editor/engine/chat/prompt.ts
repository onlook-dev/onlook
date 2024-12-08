import {
    type ChatMessageContext,
    type FileMessageContext,
    type HighlightedMessageContext,
} from '@onlook/models/chat';
import { create } from 'xmlbuilder2';
import { XML_END_OPTIONS } from '/common/prompt';

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
        console.error('No files or selections found in context');
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
    const filesXml = files
        .map((file) =>
            create()
                .ele('file')
                .ele('path')
                .txt(file.name)
                .up()
                .ele('content')
                .txt(file.value)
                .up()
                .end(XML_END_OPTIONS),
        )
        .join('\n');
    return 'I am selecting these files:\n' + filesXml + '\n';
}

function getSelectionString(selections: HighlightedMessageContext[]) {
    const selectionsXml = selections
        .map((selection) =>
            create()
                .ele('selection')
                .ele('file-path')
                .txt(selection.templateNode.path)
                .up()
                .ele('range')
                .txt(
                    `${selection.templateNode.startTag.start.line},${selection.templateNode.endTag?.end.line || selection.templateNode.startTag.end.line}:${selection.templateNode.startTag.start.column},${selection.templateNode.endTag?.end.column || selection.templateNode.startTag.end.column}`,
                )
                .up()
                .ele('content')
                .txt(selection.value)
                .end(XML_END_OPTIONS),
        )
        .join('\n');

    return 'I am selecting these code snippets:\n' + selectionsXml + '\n';
}

function getUserInstructionString(instructions: string) {
    const instructionsXml = create().ele('instruction').txt(instructions).up().end(XML_END_OPTIONS);
    return 'Please make the change according to these instructions:\n' + instructionsXml;
}
