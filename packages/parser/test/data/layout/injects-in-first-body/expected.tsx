import React from 'react';import Script from "next/script";
export default function Layout() {
  return (
    <>
            <body>
        <Script src="/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>
      </body>
            <body>
                <main />
            </body>
        </>);}