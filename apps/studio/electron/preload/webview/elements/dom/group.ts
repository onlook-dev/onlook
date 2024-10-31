import { getDomElement } from '../helpers';
import { createElement } from './insert';
import { EditorAttributes } from '@onlook/models/constants';
import { getUniqueSelector } from '/common/helpers';
import type {
    ActionElement,
    ActionElementLocation,
    GroupActionTarget,
} from '@onlook/models/actions';
import type { DomElement } from '@onlook/models/element';

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

    const containerEl = createElement(container);
    parentEl.insertBefore(containerEl, parentEl.children[location.index]);

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
            containerEl.appendChild(el.cloneNode(true));
            (el as HTMLElement).style.display = 'none';
        });

    return getDomElement(containerEl, true);
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

    const containerEl: HTMLElement | null = document.querySelector(container.selector);

    if (!containerEl) {
        console.error('Failed to find group element', container.selector);
        return null;
    }

    containerEl.style.display = 'none';
    const groupChildren = Array.from(containerEl.children).filter((child) => child !== containerEl);

    groupChildren.forEach((child) => {
        child.setAttribute(EditorAttributes.DATA_ONLOOK_INSERTED, 'true');
        const selector = getUniqueSelector(child as HTMLElement);
        const target = targets.find((t) => t.selector === selector);
        if (target) {
            parentEl.insertBefore(child, parentEl.children[target.index]);
        }
    });

    return getDomElement(parentEl, true);
}
