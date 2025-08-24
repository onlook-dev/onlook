'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { env } from '@/env';

export default function RB2BLoader() {
    const pathname = usePathname();

    useEffect(() => {
        if (!env.NEXT_PUBLIC_RB2B_ID) return;
        
        const existing = document.getElementById('rb2b-script');
        if (existing) existing.remove();
        
        const script = document.createElement('script');
        script.id = 'rb2b-script';
        script.src = `https://ddwl4m2hdecbv.cloudfront.net/b/${env.NEXT_PUBLIC_RB2B_ID}/${env.NEXT_PUBLIC_RB2B_ID}.js.gz`;
        script.async = true;
        document.body.appendChild(script);
    }, [pathname]);

    return null;
}
