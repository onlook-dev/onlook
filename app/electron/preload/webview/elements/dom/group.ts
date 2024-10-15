import { getDomElement } from '../helpers';
import { createElement } from './insert';
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
            parentEl.removeChild(el);
            groupEl.appendChild(el);
        });

    return getDomElement(groupEl, true);
}
