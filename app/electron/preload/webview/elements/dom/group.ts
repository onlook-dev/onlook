import { getDomElement } from '../helpers';
import { ActionElementLocation, GroupActionTarget } from '/common/models/actions';
import { DomElement } from '/common/models/element';

export function groupElements(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
): DomElement | null {
    const parentEl: HTMLElement | null = document.querySelector(location.targetSelector);
    if (!parentEl) {
        console.error('Failed to find parent element', location.targetSelector);
        return null;
    }

    const groupEl = document.createElement('div');
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

    return getDomElement(parentEl, true);
}
