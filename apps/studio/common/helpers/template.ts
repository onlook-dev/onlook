import type { TemplateNode } from '@onlook/models/element';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';

export function encode(templateNode: TemplateNode) {
    const buffer = strToU8(JSON.stringify(templateNode));
    const compressed = compressSync(buffer);
    const binaryString = Array.from(new Uint8Array(compressed))
        .map((byte) => String.fromCharCode(byte))
        .join('');
    const base64 = btoa(binaryString);
    return base64;
}

export function decode(encodedTemplateNode: string): TemplateNode {
    const buffer = new Uint8Array(
        atob(encodedTemplateNode)
            .split('')
            .map((c) => c.charCodeAt(0)),
    );
    const decompressed = decompressSync(buffer);
    const JsonString = strFromU8(decompressed);
    const templateNode = JSON.parse(JsonString) as TemplateNode;
    return templateNode;
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

export function areTemplateNodesEqual(node1: TemplateNode, node2: TemplateNode): boolean {
    return (
        node1.path === node2.path &&
        node1.component === node2.component &&
        compareTemplateNodes(node1, node2) === 0
    );
}
