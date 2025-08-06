'use client';

import { Footer } from './landing-page/page-footer';

interface WebsiteLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

export function WebsiteLayout({ children, showFooter = true }: WebsiteLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Page content */}
            <div>
                {children}
            </div>
            
            {/* Footer */}
            {showFooter && <Footer />}
        </div>
    );
}   