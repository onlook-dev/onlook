import React from 'react';import Script from "next/script";
export default function Layout() {
  return <html lang="en"><body><Script src="/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script"></Script>
      <>
            <div>Header</div>
            <main />
        </></body></html>;

}