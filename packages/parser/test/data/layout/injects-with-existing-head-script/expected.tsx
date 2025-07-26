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
            
        <Script src="/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>

        <Script src="https://app.posthog.com/static/array.js" strategy="beforeInteractive" id="posthog-js"></Script>

        <Script src="/posthog-iframe.js" strategy="afterInteractive" id="posthog-iframe.js"></Script>
      </body>
        </html>);}