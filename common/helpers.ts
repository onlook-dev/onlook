import { TemplateNode } from "./models";

export function querySelectorCommand(selector: string) {
    return `document.querySelector('${CSS.escape(selector)}')`
}

export function compareTemplateNodes(node1: TemplateNode, node2: TemplateNode): number {
    if (node1.startTag.start.line < node2.startTag.start.line) {
        return -1;  // node1 comes before node2
    } else if (node1.startTag.start.line > node2.startTag.start.line) {
        return 1;   // node1 comes after node2
    } else {
        // Lines are the same, compare columns
        if (node1.startTag.start.column < node2.startTag.start.column) {
            return -1;  // node1 comes before node2
        } else if (node1.startTag.start.column > node2.startTag.start.column) {
            return 1;   // node1 comes after node2
        } else {
            return 0;   // Both nodes are at the same position
        }
    }
}