(function () {
    if (typeof window !== 'undefined') {
        // Define custom element
        class BuiltWithOnlook extends HTMLElement {
            constructor() {
                super();
                const shadow = this.attachShadow({ mode: 'open' });

                // Create styles
                const style = document.createElement('style');
                style.textContent = `
                    :host {
                        position: fixed;
                        bottom: 10px;
                        right: 10px;
                        z-index: 9999;
                        display: block;
                    }
                    .badge {
                        display: flex;
                        align-items: center;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        font-size: 12px;
                        color: #fff;
                        background: #000;
                        border-radius: 4px;
                        padding: 4px 8px;
                        text-decoration: none;
                        transition: all 0.2s ease;
                        opacity: 0.7;
                    }
                    .badge:hover {
                        opacity: 1;
                    }
                    .logo {
                        width: 16px;
                        height: 16px;
                        margin-right: 6px;
                    }
                `;

                // Create badge link
                const link = document.createElement('a');
                link.href = 'https://onlook.dev';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'badge';

                // Create logo
                const logo = document.createElement('img');
                logo.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDI0QzE4LjYyNzQgMjQgMjQgMTguNjI3NCAyNCAxMkMyNCA1LjM3MjU4IDE4LjYyNzQgMCAxMiAwQzUuMzcyNTggMCAwIDUuMzcyNTggMCAxMkMwIDE4LjYyNzQgNS4zNzI1OCAyNCAxMiAyNFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMiAyNEMxOC42Mjc0IDI0IDI0IDE4LjYyNzQgMjQgMTJDMjQgNS4zNzI1OCAxOC42Mjc0IDAgMTIgMEM1LjM3MjU4IDAgMCA1LjM3MjU4IDAgMTJDMCAxOC42Mjc0IDUuMzcyNTggMjQgMTIgMjRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMjRDMTguNjI3NCAyNCAyNCAxOC42Mjc0IDI0IDEyQzI0IDUuMzcyNTggMTguNjI3NCAwIDEyIDBDNS4zNzI1OCAwIDAgNS4zNzI1OCAwIDEyQzAgMTguNjI3NCA1LjM3MjU4IDI0IDEyIDI0WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTEyIDIwQzE2LjQxODMgMjAgMjAgMTYuNDE4MyAyMCAxMkMyMCA3LjU4MTcyIDE2LjQxODMgNCAxMiA0QzcuNTgxNzIgNCA0IDcuNTgxNzIgNCAxMkM0IDE2LjQxODMgNy41ODE3MiAyMCAxMiAyMFoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGQ9Ik0xMiAxNkMxNC4yMDkxIDE2IDE2IDE0LjIwOTEgMTYgMTJDMTYgOS43OTA4NiAxNC4yMDkxIDggMTIgOEM5Ljc5MDg2IDggOCA5Ljc5MDg2IDggMTJDOCAxNC4yMDkxIDkuNzkwODYgMTYgMTIgMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
                logo.className = 'logo';
                logo.alt = 'Onlook Logo';

                // Create text
                const text = document.createTextNode('Built with Onlook');

                // Append elements
                link.appendChild(logo);
                link.appendChild(text);
                shadow.appendChild(style);
                shadow.appendChild(link);
            }
        }

        // Register custom element
        if (!customElements.get('built-with-onlook')) {
            customElements.define('built-with-onlook', BuiltWithOnlook);
        }

        // Add element to page
        document.addEventListener('DOMContentLoaded', () => {
            if (!document.querySelector('built-with-onlook')) {
                const badge = document.createElement('built-with-onlook');
                document.body.appendChild(badge);
            }
        });
    }
})();
