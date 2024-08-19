import { finder } from '../selector';

export function escapeSelector(selector: string) {
    return CSS.escape(selector);
}
export function querySelectorCommand(selector: string) {
    return `document.querySelector('${escapeSelector(selector)}')`;
}

export const getUniqueSelector = (el: HTMLElement, root?: Element | undefined): string => {
    let selector = el.tagName.toLowerCase();
    try {
        if (el.nodeType !== Node.ELEMENT_NODE) {
            return selector;
        }
        if (root) {
            selector = finder(el, { className: () => false, root });
        } else {
            selector = finder(el, { className: () => false });
        }
    } catch (e) {
        console.warn('Error creating selector ', e);
    }
    return selector;
};

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
