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
            
        <Script src="onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>
      </body>
        </html>);}