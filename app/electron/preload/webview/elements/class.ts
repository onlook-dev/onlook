export function updateClass(selector: string, added: string[], removed: string[]) {
    const el = document.querySelector(selector);
    if (!el) {
        return;
    }
    el.classList.add(...added);
    el.classList.remove(...removed);
}
