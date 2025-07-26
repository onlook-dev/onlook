import React from 'react';import Script from "next/script";
export default function Layout() {
  return (
    <html>
            <body className="custom">
                <main />
            
        <Script src="/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>

        <Script src="https://app.posthog.com/static/array.js" strategy="beforeInteractive" id="posthog-js"></Script>

        <Script src="/posthog-iframe.js" strategy="afterInteractive" id="posthog-iframe.js"></Script>
      </body>
        </html>);}