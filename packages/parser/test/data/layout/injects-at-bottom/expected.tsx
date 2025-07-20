import React from 'react';import Script from "next/script";
export default function Layout() {
  return (
    <html>
            <body>
                <main />
                <footer />
            
        <Script src="onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>
      </body>
        </html>);}