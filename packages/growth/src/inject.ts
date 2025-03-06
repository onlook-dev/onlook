export function injectBuiltWithScript() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/builtwith@5.3.0/dist/builtwith.min.js';
    document.head.appendChild(script);
}
