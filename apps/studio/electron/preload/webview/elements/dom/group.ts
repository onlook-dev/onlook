import type { ActionTarget, GroupContainer } from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { getOrAssignDomId } from '../../ids';
import { getDomElement } from '../helpers';
import { elementFromDomId } from '/common/helpers';

export function groupElements(
    parent: ActionTarget,
    container: GroupContainer,
    children: Array<ActionTarget>,
): DomElement | null {
    const parentEl = elementFromDomId(parent.domId);
    if (!parentEl) {
        console.error('Failed to find parent element', parent.domId);
        return null;
    }

    const containerEl = createContainerElement(container);

    // Find child elements and their positions
    const childrenMap = new Set(children.map((c) => c.domId));
    const childrenWithIndices = Array.from(parentEl.children)
        .map((child, index) => ({
            element: child as HTMLElement,
            index,
            domId: getOrAssignDomId(child as HTMLElement),
        }))
        .filter(({ domId }) => childrenMap.has(domId));

    if (childrenWithIndices.length === 0) {
        console.error('No valid children found to group');
        return null;
    }

    // Insert container at the position of the first child
    const insertIndex = Math.min(...childrenWithIndices.map((c) => c.index));
    parentEl.insertBefore(containerEl, parentEl.children[insertIndex]);

    // Move children into container
    childrenWithIndices.forEach(({ element }) => {
        const newElement = element.cloneNode(true) as HTMLElement;

        newElement.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
        containerEl.appendChild(newElement);
        element.style.display = 'none';
        removeIdsFromChildElement(element);
    });

    return getDomElement(containerEl, true);
}

export function ungroupElements(
    parent: ActionTarget,
    container: GroupContainer,
    children: Array<ActionTarget>,
): DomElement | null {
    const parentEl = elementFromDomId(parent.domId);
    if (!parentEl) {
        console.error('Failed to find parent element', parent.domId);
        return null;
    }

    const containerEl = Array.from(parentEl.children).find(
        (child) => child.getAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID) === container.domId,
    ) as HTMLElement | undefined;
    if (!containerEl) {
        console.error('Failed to find container element', parent.domId);
        return null;
    }

    // Insert container children in order into parent behind container
    Array.from(containerEl.children).forEach((child) => {
        child.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
        parentEl.insertBefore(child, containerEl);
    });
    containerEl.style.display = 'none';
    return getDomElement(parentEl, true);
}

function createContainerElement(target: GroupContainer): HTMLElement {
    const containerEl = document.createElement(target.tagName);
    Object.entries(target.attributes).forEach(([key, value]) => {
        containerEl.setAttribute(key, value);
    });
    containerEl.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
    containerEl.setAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID, target.domId);
    containerEl.setAttribute(EditorAttributes.DATA_ONLOOK_ID, target.oid);
    return containerEl;
}

function removeIdsFromChildElement(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_ID);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_INSERTED);

    const children = Array.from(el.children);
    if (children.length === 0) {
        return;
    }

    children.forEach((child) => {
        removeIdsFromChildElement(child as HTMLElement);
    });
}
