import Script from "next/script";export default function Document() {
  return <html>
    <body><Script src="/onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script></body>
  </html>;}