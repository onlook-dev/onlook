import { getDomElement } from '../helpers';
import { ActionElementLocation, GroupActionTarget } from '/common/models/actions';
import { DomElement } from '/common/models/element';

export function groupElements(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
): DomElement | null {
    const targetEls = targets
        .map((target) => {
            const el = document.querySelector(target.selector);
            if (!el) {
                console.error('Failed to find element', target.selector);
                return null;
            }
            return el;
        })
        .filter((el) => el !== null) as HTMLElement[];

    const parentEl: HTMLElement | null = document.querySelector(location.targetSelector);
    console.log('Parent element', location.targetSelector);
    if (!parentEl) {
        console.error('Failed to find parent element', location.targetSelector);
        return null;
    }

    console.log('Target elements', targetEls);
    console.log('Parent element', parentEl);

    const groupEl = document.createElement('div');
    groupEl.style.display = 'flex';

    console.log(parentEl.children.length);
    parentEl.insertBefore(groupEl, parentEl.children[location.index]);

    targetEls.forEach((el) => {
        parentEl.removeChild(el);
        groupEl.appendChild(el);
    });

    // Insert into parent at index
    console.log(parentEl.children.length);
    return getDomElement(parentEl, true);
}
