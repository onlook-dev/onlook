export function querySelectorCommand(selector: string) {
    return `document.querySelector('${CSS.escape(selector)}')`
}