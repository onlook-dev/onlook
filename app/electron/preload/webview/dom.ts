// @ts-expect-error - No types for bundle
import { uuid } from './bundles/uuid.js';

import { ipcRenderer } from 'electron';
import { EditorAttributes, WebviewChannels } from '/common/constants';

export function processDom() {
    function insertDataAttribute(root: Node) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);

        // Traverse the DOM
        let node;
        while ((node = walker.nextNode())) {
            // Check if the node is an Element
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Insert the data attribute
                (node as HTMLElement).setAttribute(EditorAttributes.DATA_ONLOOK_UNIQUE_ID, uuid());
            }
        }
        ipcRenderer.sendToHost(WebviewChannels.DOM_READY);
    }

    // Usage example
    insertDataAttribute(document.body);
}
