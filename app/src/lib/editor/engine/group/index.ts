import React from 'react';
import { EditorEngine } from '..';
import { escapeSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import { MoveElementAction } from '/common/models/actions';
import { DomElement, ElementPosition, WebViewElement } from '/common/models/element';

export class GroupManager {
    constructor(private editorEngine: EditorEngine) {}

    canGroupElements(elements: WebViewElement[]) {
        // Check every element has the same element.parent?.selector

        if (elements.length === 0) {
            return false;
        }
        if (elements.length === 1) {
            return true;
        }
        const parentSelector = elements[0].parent?.selector;
        if (!parentSelector) {
            return false;
        }
        return elements.every((el) => el.parent?.selector === parentSelector);
    }

    groupSelectedElements() {
        const selectedEls = this.editorEngine.elements.selected;
        if (!this.canGroupElements(selectedEls)) {
            console.error('Cannot group elements');
            return;
        }
    }
}
