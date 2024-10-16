import { getDomElement } from '../helpers';
import { createElement } from './insert';
import { EditorAttributes } from '/common/constants';
import { getUniqueSelector } from '/common/helpers';
import { ActionElement, ActionElementLocation, GroupActionTarget } from '/common/models/actions';
import { DomElement } from '/common/models/element';

export function groupElements(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
    container: ActionElement,
): DomElement | null {
    const parentEl: HTMLElement | null = document.querySelector(location.targetSelector);
    if (!parentEl) {
        console.error('Failed to find parent element', location.targetSelector);
        return null;
    }

    const groupEl = createElement(container);
    parentEl.insertBefore(groupEl, parentEl.children[location.index]);

    targets
        .map((target) => {
            const el = document.querySelector(target.selector);
            if (!el) {
                console.error('Failed to find element', target.selector);
                return null;
            }
            return el;
        })
        .filter((el) => el !== null)
        .sort((a, b) => {
            return (
                Array.from(parentEl.children).indexOf(a) - Array.from(parentEl.children).indexOf(b)
            );
        })
        .forEach((el) => {
            groupEl.appendChild(el.cloneNode(true));
            (el as HTMLElement).style.display = 'none';
        });

    return getDomElement(groupEl, true);
}

export function ungroupElements(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
    container: ActionElement,
): DomElement | null {
    const parentEl: HTMLElement | null = document.querySelector(location.targetSelector);
    if (!parentEl) {
        console.error('Failed to find parent element', location.targetSelector);
        return null;
    }

    const containerElement: HTMLElement | null = document.querySelector(container.selector);

    if (!containerElement) {
        console.error('Failed to find group element', container.selector);
        return null;
    }

    containerElement.style.display = 'none';
    const groupChildren = Array.from(containerElement.children);

    groupChildren.forEach((child) => {
        const selector = getUniqueSelector(child as HTMLElement);
        const target = targets.find((t) => t.selector === selector);
        if (target) {
            child.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
            parentEl.insertBefore(child, parentEl.children[target.index]);
        }
    });

    return getDomElement(parentEl, true);
}
