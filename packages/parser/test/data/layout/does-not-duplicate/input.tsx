import Script from 'next/script';

export default function Document() {
    return (
        <html>
            <head>
                <title>Test</title>
                <Script type="module" src="/onlook-preload-script.js" />
            </head>
            <body>
                <main />
                <Script
                    type="module"
                    src="/onlook-preload-script.js"
                    id="onlook-preload-script"
                    strategy="beforeInteractive"
                />
            </body>
        </html>
    );
}
