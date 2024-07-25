import { decompressSync, strFromU8 } from 'fflate';
import { EditorAttributes } from '../constants';
import { TemplateNode } from '../models/element/templateNode';

export function getTemplateNodes(element: Element): TemplateNode[] | undefined {
    const encodedTemplates = element.getAttribute(EditorAttributes.DATA_ONLOOK_ID);
    if (!encodedTemplates) {
        return;
    }
    const templates = decode(encodedTemplates);
    return templates;
}

export function decode(encodedTemplateNode: string): TemplateNode[] {
    const buffer = new Uint8Array(
        atob(encodedTemplateNode)
            .split('')
            .map((c) => c.charCodeAt(0)),
    );
    const decompressed = decompressSync(buffer);
    const JsonString = strFromU8(decompressed);
    const templates = JSON.parse(JsonString) as TemplateNode[];
    return templates;
}

export function compareTemplateNodes(node1: TemplateNode, node2: TemplateNode): number {
    if (node1.startTag.start.line < node2.startTag.start.line) {
        return -1;
    } else if (node1.startTag.start.line > node2.startTag.start.line) {
        return 1;
    } else {
        if (node1.startTag.start.column < node2.startTag.start.column) {
            return -1;
        } else if (node1.startTag.start.column > node2.startTag.start.column) {
            return 1;
        } else {
            return 0;
        }
    }
}
