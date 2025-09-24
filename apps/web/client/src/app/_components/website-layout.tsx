'use client';

import { Footer } from './landing-page/page-footer';
import { TopBar } from './top-bar';

interface WebsiteLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

export function WebsiteLayout({ children, showFooter = true }: WebsiteLayoutProps) {
    return (
        <div className="bg-background min-h-screen">
            {/* Fixed TopBar that persists across page transitions */}
            <div className="bg-background/80 top-bar fixed top-0 left-0 z-50 h-12 w-full backdrop-blur-sm">
                <TopBar />
            </div>

            {/* Page content */}
            <div>{children}</div>

            {/* Footer */}
            {showFooter && <Footer />}
        </div>
    );
}
