(function () {
    if (typeof window !== 'undefined') {
        // Run after page load
        window.addEventListener('load', function () {
            // Create badge element
            const badge = document.createElement('div');
            badge.innerHTML = 'Built with Onlook';
            badge.style.position = 'fixed';
            badge.style.bottom = '20px';
            badge.style.right = '20px';
            badge.style.backgroundColor = '#000';
            badge.style.color = '#fff';
            badge.style.padding = '8px 16px';
            badge.style.borderRadius = '4px';
            badge.style.fontFamily = 'Inter, sans-serif';
            badge.style.fontSize = '14px';
            badge.style.zIndex = '9999';
            badge.style.cursor = 'pointer';

            badge.onclick = function () {
                window.open('https://onlook.com', '_blank');
            };

            document.body.appendChild(badge);
        });
    }
})();
