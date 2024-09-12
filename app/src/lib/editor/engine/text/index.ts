import { WebviewTag } from 'electron';
import { OverlayManager } from '../overlay';
import { escapeSelector } from '/common/helpers';
import { DomElement, TextDomElement } from '/common/models/element';

export class TextEditingManager {
    constructor(private overlay: OverlayManager) {}

    get isEditing() {
        return true;
    }

    async start(el: DomElement, webview: WebviewTag) {
        const textEditEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${escapeSelector(el.selector)}')`,
        );

        if (!textEditEl) {
            console.log('Failed to edit text: Invalid element');
            return;
        }
        console.log(textEditEl);
    }

    end() {
        console.log('end');
        // When edit finishes, if string is empty, remove the p tag
    }

    clear() {}
}
