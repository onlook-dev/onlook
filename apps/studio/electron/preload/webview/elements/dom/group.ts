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
        containerEl.appendChild(element);
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
    );
    if (!containerEl) {
        console.error('Failed to find container element', parent.domId);
        return null;
    }

    // Insert container children in order into parent behind container
    Array.from(containerEl.children)
        .reverse()
        .forEach((child) => {
            parentEl.insertBefore(child, containerEl);
        });
    parentEl.removeChild(containerEl);
    return getDomElement(parentEl, true);
}

function createContainerElement(target: GroupContainer): HTMLElement {
    const containerEl = document.createElement(target.tagName);
    containerEl.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
    containerEl.setAttribute(EditorAttributes.DATA_ONLOOK_DOM_ID, target.domId);
    Object.entries(target.attributes).forEach(([key, value]) => {
        containerEl.setAttribute(key, value);
    });
    target.oid && containerEl.setAttribute(EditorAttributes.DATA_ONLOOK_ID, target.oid);
    return containerEl;
}
