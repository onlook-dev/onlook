import Script from 'next/script';
import React from 'react';
export default function Layout() {
    return (
        <html>
            <head>
                <Script src="https://example.com/other.js" />
            </head>
            <body>
                <main />
            </body>
        </html>
    );
}
