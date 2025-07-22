import Script from "next/script";export default function RootLayout({
  children


}: {children: React.ReactNode;}) {
  return (
    <html lang="en" dir="ltr" className="h-full">
      <body><Script src="onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script></body>
    </html>);}