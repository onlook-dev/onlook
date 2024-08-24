import { EditorAttributes } from '/common/constants';

export function dragElement(x: number, y: number, selector: string) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return;
    }

    saveStyle(el);
    el.style.position = 'absolute';
    el.style.transform = `translate(${x}px, ${y}px)`;
}

export function endDragElement(x: number, y: number, selector: string) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return;
    }

    restoreStyle(el);
}

function saveStyle(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (saved) {
        return;
    }

    const style = {
        position: el.style.position,
        transform: el.style.transform,
    };
    el.setAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE, JSON.stringify(style));
}

function restoreStyle(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (!saved) {
        return;
    }

    const style = JSON.parse(saved);
    el.style.position = style.position;
    el.style.transform = style.transform;
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
}
