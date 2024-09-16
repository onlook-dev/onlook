import { getLocationFromSelector } from './helpers';
import { ActionElement, RemoveElementAction } from '/common/actions';

export function getRemoveActionFromSelector(
    selector: string,
    webviewId: string,
): RemoveElementAction | undefined {
    const el = document.querySelector(selector);
    if (!el) {
        return;
    }

    const location = getLocationFromSelector(selector);
    if (!location) {
        return;
    }

    const actionEl = getActionElement(el as HTMLElement);

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
