import Script from 'next/script';
export default function Document() {
    return (
        <html>
            <head>
                <title>Test</title>
                <Script type="module" src="https://some-url/onlook-dev/web/script.js" />
            </head>
            <body>
                <main />
            </body>
        </html>
    );
}
