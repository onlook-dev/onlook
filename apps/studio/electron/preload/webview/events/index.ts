import { ipcRenderer } from 'electron';
import { processDom } from '../dom';
import { groupElements, ungroupElements } from '../elements/dom/group';
import { insertElement, removeElement } from '../elements/dom/insert';
import { moveElement } from '../elements/move';
import { clearTextEditedElements, editTextBySelector } from '../elements/text';
import { cssManager } from '../style';
import { listenForDomMutation } from './dom';
import {
    publishEditText,
    publishGroupElement,
    publishInsertElement,
    publishMoveElement,
    publishRemoveElement,
    publishUngroupElement,
} from './publish';
import { WebviewChannels } from '/common/constants';
import type {
    ActionElement,
    ActionElementLocation,
    GroupActionTarget,
} from '/common/models/actions';

export function listenForEvents() {
    listenForWindowEvents();
    listenForDomMutation();
    listenForEditEvents();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        ipcRenderer.sendToHost(WebviewChannels.WINDOW_RESIZED);
    });
}

function listenForEditEvents() {
    ipcRenderer.on(WebviewChannels.UPDATE_STYLE, (_, data) => {
        const { selector, style, value } = data;
        cssManager.updateStyle(selector, style, value);
        ipcRenderer.sendToHost(WebviewChannels.STYLE_UPDATED, selector);
    });

    ipcRenderer.on(WebviewChannels.INSERT_ELEMENT, (_, data) => {
        const { element, location, editText } = data as {
            element: ActionElement;
            location: ActionElementLocation;
            editText: boolean;
        };
        const domEl = insertElement(element, location);
        if (domEl) {
            publishInsertElement(location, domEl, editText);
        }
    });

    ipcRenderer.on(WebviewChannels.REMOVE_ELEMENT, (_, data) => {
        const { location, hasCode } = data as { location: ActionElementLocation; hasCode: boolean };
        if (!hasCode) {
            removeElement(location);
        }
        publishRemoveElement(location);
    });

    ipcRenderer.on(WebviewChannels.MOVE_ELEMENT, (_, data) => {
        const { selector, newIndex } = data as {
            selector: string;
            newIndex: number;
        };
        const domEl = moveElement(selector, newIndex);
        if (domEl) {
            publishMoveElement(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.EDIT_ELEMENT_TEXT, (_, data) => {
        const { selector, content } = data as {
            selector: string;
            content: string;
        };
        const domEl = editTextBySelector(selector, content);
        if (domEl) {
            publishEditText(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.GROUP_ELEMENTS, (_, data) => {
        const { targets, location, container } = data as {
            targets: Array<GroupActionTarget>;
            location: ActionElementLocation;
            container: ActionElement;
        };
        const domEl = groupElements(targets, location, container);
        if (domEl) {
            publishGroupElement(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.UNGROUP_ELEMENTS, (_, data) => {
        const { targets, location, container } = data as {
            targets: Array<GroupActionTarget>;
            location: ActionElementLocation;
            container: ActionElement;
        };
        const parentDomEl = ungroupElements(targets, location, container);
        if (parentDomEl) {
            publishUngroupElement(parentDomEl);
        }
    });

    ipcRenderer.on(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE, () => {
        clearTextEditedElements();
        processDom();
    });
}
