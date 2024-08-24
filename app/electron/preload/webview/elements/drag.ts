import { EditorAttributes } from '/common/constants';

export function startDrag(selector: string) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return;
    }
    markElementForDragging(el);
    createStub(el.getBoundingClientRect());
}

export function drag(x: number, y: number) {
    const el = getDragElement();
    el.style.position = 'absolute';
    el.style.transform = `translate(${x}px, ${y}px)`;
    moveStub(el);
}

export function endDrag(x: number, y: number) {
    const el = getDragElement();
    restoreStyle(el);
    removeStub();
}

function getDragElement(): HTMLElement {
    const el = document.querySelector('[data-onlook-dragging]') as HTMLElement | null;
    if (!el) {
        throw new Error('Element not found');
    }
    return el;
}

function markElementForDragging(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (saved) {
        return;
    }

    const style = {
        position: el.style.position,
        transform: el.style.transform,
    };
    el.setAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute('data-onlook-dragging', 'true');
}

function restoreStyle(el: HTMLElement) {
    try {
        const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
        if (!saved) {
            return;
        }
        const style = JSON.parse(saved);
        for (const key in style) {
            el.style[key as any] = style[key];
        }
    } catch (e) {
        console.error(e);
    }

    el.removeAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    el.removeAttribute('data-onlook-dragging');
}

function createStub(rect: DOMRect) {
    const stub = document.createElement('div');
    stub.style.width = `${rect.width}px`;
    stub.style.height = `${rect.height}px`;
    stub.style.top = `${rect.top}px`;
    stub.style.left = `${rect.left}px`;
    stub.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    stub.id = 'onlook-drag-stub';
    stub.style.display = 'none';
    document.body.appendChild(stub);
}

function moveStub(el: HTMLElement) {
    const stub = document.getElementById('onlook-drag-stub');
    if (!stub) {
        return;
    }
    stub.remove();
    el.insertAdjacentElement('afterend', stub);
    stub.style.display = 'block';
}

function removeStub() {
    const stub = document.getElementById('onlook-drag-stub');
    if (!stub) {
        return;
    }
    stub.remove();
}
