import { getElementLocation } from './helpers';
import { ActionElement, RemoveElementAction } from '/common/actions';

export function getRemoveActionFromSelector(
    selector: string,
    webviewId: string,
): RemoveElementAction | undefined {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        return;
    }

    const location = getElementLocation(el);
    if (!location) {
        return;
    }

    const actionEl = getActionElement(el);

    return {
        type: 'remove-element',
        targets: [{ webviewId }],
        location: location,
        element: actionEl,
        styles: {},
    };
}

function getActionElement(el: HTMLElement): ActionElement {
    const children = Array.from(el.children).map((child) => getActionElement(child as HTMLElement));
    const textContent = el.textContent || '';
    const attributes: Record<string, string> = {};
    for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
    }

    return {
        tagName: el.tagName.toLowerCase(),
        attributes,
        children,
        textContent,
    };
}
