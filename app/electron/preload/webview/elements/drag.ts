export function dragElement(x: number, y: number, selector: string) {
    const el = document.querySelector(selector);
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return;
    }
    el.style.transform = `translate(${x}px, ${y}px)`;
}

export function endDragElement(x: number, y: number, selector: string) {
    const el = document.querySelector(selector);
    if (!el) {
        console.error(`Element not found: ${selector}`);
        return;
    }
    el.style.transform = '';
}
