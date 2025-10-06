import Script from "next/script";export default function Document() {
  return <html>
    <body><Script src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@d3887f2/apps/web/client/public/onlook-preload-script.js" strategy="afterInteractive" type="module" id="onlook-preload-script"></Script></body>
  </html>;}