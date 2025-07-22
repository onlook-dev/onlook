import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        
        {/* Similar script with different path format - should this be detected? */}
        <Script src="/onlook-preload-script.js" strategy="beforeInteractive" />
        
        {/* Script with same filename but different attributes */}
        <Script 
          src="onlook-preload-script.js" 
          strategy="afterInteractive"
          id="custom-onlook-script" 
        />
      </body>
    </html>
  )
}