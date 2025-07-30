import React from 'react';import Script from "next/script";
export default function Layout() {
  return (
    <html>
            <body className="custom">
                <main />
            
        <Script src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/client/public/onlook-preload-script.js" strategy="afterInteractive" type="module" id="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/client/public/onlook-preload-script.js"></Script>
      </body>
        </html>);}