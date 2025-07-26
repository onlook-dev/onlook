import React from 'react';import Script from "next/script";
export default function Layout() {
  return <html lang="en"><body><Script src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/client/public/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/client/public/onlook-preload-script.js"></Script>
      {true ? <div /> : <span />}</body></html>;}