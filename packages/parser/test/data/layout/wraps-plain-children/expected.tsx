import React from 'react';import Script from "next/script";
export default function Layout({ children }: {children: React.ReactNode;}) {
  return <html lang="en"><body><Script src="/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>
      {children}</body></html>;}