import { ipcRenderer } from 'electron';
import { uuid } from './bundles';
import { EditorAttributes, WebviewChannels } from '/common/constants';

export function processDom(root: Node = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);

    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            (node as HTMLElement).setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, uuid());
        }
    }
    ipcRenderer.sendToHost(WebviewChannels.DOM_READY);
}
