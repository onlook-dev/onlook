// Dynamic robots.txt using Next.js route handler
import { NextResponse } from 'next/server';

export function GET() {
  const body = `User-agent: *\nAllow: /\nSitemap: https://docs.onlook.dev/sitemap.xml`;
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
