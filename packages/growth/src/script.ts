export const builtWithScript = `
(function () {
    if (typeof window !== 'undefined') {
        // Define custom element
        class BuiltWithOnlook extends HTMLElement {
            constructor() {
                super();
                const shadow = this.attachShadow({ mode: 'open' });

                // Create styles
                const style = document.createElement('style');
                style.textContent = \`
                    :host {
                        position: fixed;
                        bottom: 10px;
                        right: 10px;
                        z-index: 9999;
                        display: block;
                    }
                    .badge {
                        background-color: #000;
                        color: #fff;
                        padding: 4px 10px;
                        border-radius: 4px;
                        font-family: Inter, sans-serif;
                        font-size: 12px;
                        font-weight: 400;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .logo {
                        width: 22px;
                        height: 22px;
                        fill: currentColor;
                    }
                \`;

                const badge = document.createElement('div');
                badge.className = 'badge';

                // Create SVG element
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 300 300');
                svg.setAttribute('fill', 'none');
                svg.classList.add('logo');

                // Add SVG path for the Onlook logo
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('fill', 'currentColor');
                path.setAttribute(
                    'd',
                    'M202.08 235.385C230.819 217.818 250 186.149 250 150C250 94.7715 205.228 50 150 50C94.7715 50 50 94.7715 50 150C50 173.663 58.2187 195.406 71.9571 212.53L108.457 183.393V142.851V124.616L86.1507 102.309H108.457H192.365C200.318 102.309 206.765 108.756 206.765 116.709V142.462C199.252 137.261 193.843 133.078 193.843 133.078L168.458 148.462L211.92 185.386L202.08 235.385ZM152.787 113.509H183.163C183.163 113.509 184.303 126.155 167.688 126.155C152.787 113.508 152.787 113.509 152.787 113.509Z',
                );

                svg.appendChild(path);

                const text = document.createElement('span');
                text.textContent = 'Built with Onlook';

                badge.appendChild(svg);
                badge.appendChild(text);

                badge.addEventListener('click', () => {
                    window.open('https://onlook.com', '_blank');
                });

                badge.addEventListener('mouseenter', () => {
                    badge.style.backgroundColor = '#333';
                });

                badge.addEventListener('mouseleave', () => {
                    badge.style.backgroundColor = '#000';
                });

                shadow.appendChild(style);
                shadow.appendChild(badge);
            }
        }

        // Register custom element
        customElements.define('built-with-onlook', BuiltWithOnlook);

        // Run after page load
        window.addEventListener('load', function () {
            // Create and append the custom element
            const badge = document.createElement('built-with-onlook');
            document.body.appendChild(badge);
        });
    }
})();
`;
