import type {
    ActionElement,
    ActionLocation,
    ActionTarget,
    Change,
    GroupContainer,
    ImageContentData,
} from '@onlook/models/actions';
import { WebviewChannels } from '@onlook/models/constants';
import type { StyleChange } from '@onlook/models/style';
import type { TOnlookWindow } from '../api';
import { processDom } from '../dom';
import { groupElements, ungroupElements } from '../elements/dom/group';
import { insertImage, removeImage } from '../elements/dom/image';
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

    // TODO: Disabled for debugging. This is listening to all events instead of specific ones.
    // listenForEditEvents();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        (window as TOnlookWindow).onlook.bridge.send(WebviewChannels.WINDOW_RESIZED);
    });
}

function listenForEditEvents() {
    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
        const { domId, change } = data as {
            domId: string;
            change: Change<Record<string, StyleChange>>;
        };
        cssManager.updateStyle(domId, change.updated);

        publishStyleUpdate(domId);
    });

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
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

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
        const { location } = data as { location: ActionLocation };
        removeElement(location);
        publishRemoveElement(location);
    });

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
        const { domId, newIndex } = data as {
            domId: string;
            newIndex: number;
        };
        const domEl = moveElement(domId, newIndex);
        if (domEl) {
            publishMoveElement(domEl);
        }
    });

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
        const { domId, content } = data as {
            domId: string;
            content: string;
        };
        const domEl = editTextByDomId(domId, content);
        if (domEl) {
            publishEditText(domEl);
        }
    });

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
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

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
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

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
        const { domId, image } = data as {
            domId: string;
            image: ImageContentData;
        };
        insertImage(domId, image.content);
        publishStyleUpdate(domId);
    });

    (window as TOnlookWindow).onlook.bridge.receive((_, data) => {
        const { domId } = data as {
            domId: string;
        };
        removeImage(domId);
        publishStyleUpdate(domId);
    });

    (window as TOnlookWindow).onlook.bridge.receive(() => {
        processDom();
    });
}
