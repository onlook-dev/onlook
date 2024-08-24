import { EditorAttributes } from '/common/constants';

export function startDrag(selector: string) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return;
    }
    markElementForDragging(el);
    createStub(el);
}

export function drag(dx: number, dy: number, x: number, y: number) {
    const el = getDragElement();
    el.style.position = 'fixed';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    moveStub(el, x, y);
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

function createStub(el: HTMLElement) {
    const styles = window.getComputedStyle(el);
    const stub = document.createElement('div');
    stub.id = 'onlook-drag-stub';
    stub.style.width = styles.width;
    stub.style.height = styles.height;
    stub.style.margin = styles.margin;
    stub.style.padding = styles.padding;
    stub.style.borderRadius = styles.borderRadius;
    stub.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    stub.style.display = 'none';
    document.body.appendChild(stub);
}

function moveStub(el: HTMLElement, x: number, y: number) {
    const stub = document.getElementById('onlook-drag-stub');
    if (!stub) {
        return;
    }
    const parent = el.parentElement;
    if (!parent) {
        return;
    }

    const siblings = Array.from(parent.children).filter((child) => child !== stub);
    const index = findInsertionIndex(siblings, x, y);

    stub.remove();
    if (index >= siblings.length) {
        parent.appendChild(stub);
    } else {
        parent.insertBefore(stub, siblings[index]);
    }
    stub.style.display = 'block';
}

function findInsertionIndex(elements: Element[], x: number, y: number): number {
    for (let i = 0; i < elements.length; i++) {
        const rect = elements[i].getBoundingClientRect();
        if (y < rect.bottom || (y === rect.bottom && x < rect.right)) {
            return i;
        }
    }
    return elements.length;
}

function removeStub() {
    const stub = document.getElementById('onlook-drag-stub');
    if (!stub) {
        return;
    }
    stub.remove();
}
