import type {
    ActionElement,
    ActionLocation,
    ActionTarget,
    GroupContainer,
} from '@onlook/models/actions';
import { WebviewChannels } from '@onlook/models/constants';
import { ipcRenderer } from 'electron';
import { processDom } from '../dom';
import { groupElements, ungroupElements } from '../elements/dom/group';
import { insertElement, removeElement } from '../elements/dom/insert';
import { moveElement } from '../elements/move';
import { editTextByDomId } from '../elements/text';
import cssManager from '../style';
import { listenForDomMutation } from './dom';
import {
    publishEditText,
    publishGroupElement,
    publishInsertElement,
    publishMoveElement,
    publishRemoveElement,
    publishStyleUpdate,
    publishUngroupElement,
} from './publish';

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
        const { domId, style, value } = data as {
            domId: string;
            style: string;
            value: string;
        };
        cssManager.updateStyle(domId, style, value);
        publishStyleUpdate(domId);
    });

    ipcRenderer.on(WebviewChannels.INSERT_ELEMENT, (_, data) => {
        const { element, location, editText } = data as {
            element: ActionElement;
            location: ActionLocation;
            editText: boolean;
        };
        const domEl = insertElement(element, location);
        if (domEl) {
            publishInsertElement(location, domEl, editText);
        }
    });

    ipcRenderer.on(WebviewChannels.REMOVE_ELEMENT, (_, data) => {
        const { location } = data as { location: ActionLocation };
        removeElement(location);
        publishRemoveElement(location);
    });

    ipcRenderer.on(WebviewChannels.MOVE_ELEMENT, (_, data) => {
        const { domId, newIndex } = data as {
            domId: string;
            newIndex: number;
        };
        const domEl = moveElement(domId, newIndex);
        if (domEl) {
            publishMoveElement(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.EDIT_ELEMENT_TEXT, (_, data) => {
        const { domId, content } = data as {
            domId: string;
            content: string;
        };
        const domEl = editTextByDomId(domId, content);
        if (domEl) {
            publishEditText(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.GROUP_ELEMENTS, (_, data) => {
        const { parent, container, children } = data as {
            parent: ActionTarget;
            container: GroupContainer;
            children: Array<ActionTarget>;
        };
        const domEl = groupElements(parent, container, children);
        if (domEl) {
            publishGroupElement(domEl);
        }
    });

    ipcRenderer.on(WebviewChannels.UNGROUP_ELEMENTS, (_, data) => {
        const { parent, container, children } = data as {
            parent: ActionTarget;
            container: GroupContainer;
            children: Array<ActionTarget>;
        };
        const parentDomEl = ungroupElements(parent, container, children);
        if (parentDomEl) {
            publishUngroupElement(parentDomEl);
        }
    });

    ipcRenderer.on(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE, () => {
        processDom();
    });
}
