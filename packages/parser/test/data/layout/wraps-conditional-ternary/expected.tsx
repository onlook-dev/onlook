import React from 'react';import Script from "next/script";
export default function Layout() {
  return <html lang="en"><body><Script src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@d3887f2/apps/web/client/public/onlook-preload-script.js" strategy="afterInteractive" type="module" id="onlook-preload-script"></Script>
      {true ? <div /> : <span />}</body></html>;}