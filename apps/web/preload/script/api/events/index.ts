import { listenForDomMutation } from './dom';
import { publishEditText, publishGroupElement, publishInsertElement, publishMoveElement, publishRemoveElement, publishStyleUpdate, publishUngroupElement } from './publish';
import { cssManager, updateStyle } from '../style';
import { insertElement, removeElement } from '../elements/dom/insert';
import { moveElement } from '../elements/move';
import { editText } from '../elements/text';
import { groupElements, ungroupElements } from '../elements/dom/group';
import { insertImage, removeImage } from '../elements/dom/image';
import { processDom } from '../dom';
import type { ActionElement, ActionLocation, GroupContainer, ActionTarget, StyleChange, ImageContentData, Change } from '@onlook/models';
import { FrameViewEvents } from '@onlook/constants';

export function listenForEvents() {
    listenForWindowEvents();
    listenForDomMutation();
}

function listenForWindowEvents() {
    window.addEventListener('resize', () => {
        // ipcRenderer.sendToHost(WebviewChannels.WINDOW_RESIZED);
    });
}


export interface FrameViewEventArgsMap {
    [FrameViewEvents.UPDATE_STYLE]: { domId: string; style: Change<Record<string, StyleChange>> };
    [FrameViewEvents.INSERT_ELEMENT]: { element: ActionElement; location: ActionLocation; editText: boolean };
    [FrameViewEvents.REMOVE_ELEMENT]: { location: ActionLocation };
    [FrameViewEvents.MOVE_ELEMENT]: { domId: string; newIndex: number };
    [FrameViewEvents.EDIT_ELEMENT_TEXT]: { domId: string; content: string };
    [FrameViewEvents.GROUP_ELEMENTS]: { parent: ActionTarget; container: GroupContainer; children: Array<ActionTarget> };
    [FrameViewEvents.UNGROUP_ELEMENTS]: { parent: ActionTarget; container: GroupContainer };
    [FrameViewEvents.INSERT_IMAGE]: { domId: string; image: ImageContentData };
    [FrameViewEvents.REMOVE_IMAGE]: { domId: string };
    [FrameViewEvents.CLEAN_AFTER_WRITE_TO_CODE]: void;
}


type FrameViewEventPayload = {
    [K in keyof FrameViewEventArgsMap]: {
      action: K;
      args: FrameViewEventArgsMap[K];
    };
  }[keyof FrameViewEventArgsMap]; 


export function listenForFrameViewEvents(event: FrameViewEventPayload): void {
    const { action, args } = event;

    switch (action) {
        case FrameViewEvents.UPDATE_STYLE: {
            const { domId, style } = args;
            const domEl_id = updateStyle(domId, style);
            publishStyleUpdate(domEl_id);
            break;
        }
        case FrameViewEvents.INSERT_ELEMENT: {
            const { element, location, editText } = args;
            const domEl = insertElement(element, location);
            if (domEl) {
                publishInsertElement(location, domEl, editText);
            }
            break;
        }
        case FrameViewEvents.REMOVE_ELEMENT: {
            const { location } = args;
            removeElement(location);
            publishRemoveElement(location);
            break;
        }
        case FrameViewEvents.MOVE_ELEMENT: {
            const { domId, newIndex } = args;
            const domEl = moveElement(domId, newIndex);
            if (domEl) publishMoveElement(domEl);
            break;
        }
        case FrameViewEvents.EDIT_ELEMENT_TEXT: {
            const { domId, content } = args;
            const domEl = editText(domId, content);
            if (domEl) {
                publishEditText(domEl);
            }
            break;
        }
        case FrameViewEvents.GROUP_ELEMENTS: {
            const { parent, container, children } = args;
            const domEl = groupElements(parent, container, children);
            if (domEl) publishGroupElement(domEl);
            break;
        }
        case FrameViewEvents.UNGROUP_ELEMENTS: {
            const { parent, container } = args;
            const parentDomEl = ungroupElements(parent, container);
            if (parentDomEl) publishUngroupElement(parentDomEl);
            break;
        }
        case FrameViewEvents.INSERT_IMAGE: {
            const { domId, image } = args;
            insertImage(domId, image.content);
            publishStyleUpdate(domId);
            break;
        }
        case FrameViewEvents.REMOVE_IMAGE: {
            const { domId } = args;
            removeImage(domId);
            publishStyleUpdate(domId);
            break;
        }
        case FrameViewEvents.CLEAN_AFTER_WRITE_TO_CODE: {
            processDom();
            break;
        }
        default: {
            const exhaustiveCheck: never = action;
            console.warn(`Unknown event: ${exhaustiveCheck}`);
            break;
        }
    }
}